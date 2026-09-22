import {
	AmbientController,
	AnalyserAudioSource,
	AudioReactiveController,
	FakeAudioSource,
	TimelineController,
	VisualController,
	applyOverrides,
	clamp,
	easeVisualState,
	neutralVisualState,
	noise,
	targetVisualState,
} from './controller';
import {
	BloomPass,
	GlProgram,
	ParticleField,
	RenderTarget,
	Rgb,
	ScreenQuad,
	hexToRgb,
	mixRgb,
	scaleRgb,
} from './gl';
import {
	AudioFeatures,
	SongSection,
	SongVisualProfile,
	VisualInputMode,
	VisualOverrides,
	VisualQuality,
	VisualState,
} from './model';
import {
	FULLSCREEN_VERTEX,
	INDUSTRIAL_SCENE_FRAGMENT,
	PARTICLE_FRAGMENT,
	PARTICLE_VERTEX,
} from './shader';

/** How far past the nominal count a busy section may go. */
const DENSITY_HEADROOM = 1.6;

interface QualitySettings {
	pixelRatio: number;
	renderScale: number;
	particles: number;
	octaves: number;
	bloom: boolean;
}

const QUALITY: Record<VisualQuality, QualitySettings> = {
	low: {
		pixelRatio: 1,
		renderScale: 0.75,
		particles: 260,
		octaves: 3,
		bloom: false,
	},
	medium: {
		pixelRatio: 1.5,
		renderScale: 1,
		particles: 700,
		octaves: 4,
		bloom: true,
	},
	high: {
		pixelRatio: 2,
		renderScale: 1,
		particles: 1500,
		octaves: 5,
		bloom: true,
	},
};

export interface VisualEngineOptions {
	canvas: HTMLCanvasElement;
	profile: SongVisualProfile;
	mode?: VisualInputMode;
	quality?: VisualQuality;
	/** Called once per rendered frame, for a debug panel or an FPS readout. */
	onFrame?: (state: Readonly<VisualState>, fps: number) => void;
}

/** A stable number per profile, so one song's city is always the same city. */
function seedFrom(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (hash * 31 + id.charCodeAt(i)) % 100000;
	}
	return hash / 1000;
}

/**
 * Owns the canvas, the render loop and the controllers. It knows nothing about
 * any particular artist: everything it draws comes from the profile it is given
 * and from the one intensity value its current controller reports.
 */
export class VisualEngine {
	private readonly gl: WebGL2RenderingContext;
	private readonly canvas: HTMLCanvasElement;
	private readonly quad: ScreenQuad;
	private readonly sceneTarget: RenderTarget;
	private readonly bloom: BloomPass;
	private readonly particleProgram: GlProgram;

	private sceneProgram: GlProgram;
	private particles: ParticleField;
	private settings: QualitySettings;
	private quality: VisualQuality;

	private readonly ambient = new AmbientController();
	private readonly timeline = new TimelineController();
	private readonly audioReactive = new AudioReactiveController();
	private readonly fakeAudio = new FakeAudioSource();
	private readonly analyserAudio = new AnalyserAudioSource();

	private mode: VisualInputMode;
	private profile: SongVisualProfile;
	private palette: {
		background: Rgb;
		primary: Rgb;
		secondary: Rgb;
		accent: Rgb;
	};
	private seed: number;

	private readonly state: VisualState = neutralVisualState();
	private overrides: VisualOverrides | null = null;
	private sectionOverride: SongSection | null = null;

	private position = 0;
	private simulateAudio = false;
	private features: AudioFeatures | null = null;

	private elapsed = 0;
	private last = 0;
	private phase = 0;
	private pulse = 0;
	private fps = 60;

	private handle = 0;
	private running = false;
	private width = 0;
	private height = 0;

	private readonly onFrame?: (
		state: Readonly<VisualState>,
		fps: number
	) => void;

	private readonly onVisibility = () => {
		if (document.hidden) {
			this.stop();
		} else if (!this.running) {
			this.start();
		}
	};

	public constructor(options: VisualEngineOptions) {
		this.canvas = options.canvas;
		this.onFrame = options.onFrame;
		this.mode = options.mode ?? 'ambient';
		this.quality = options.quality ?? 'high';
		this.settings = QUALITY[this.quality];
		this.profile = options.profile;
		this.palette = this.readPalette(options.profile);
		this.seed = seedFrom(options.profile.id);

		const gl = this.canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: 'high-performance',
			preserveDrawingBuffer: false,
		});
		if (!gl) {
			throw new Error('This browser cannot open a WebGL2 context.');
		}
		this.gl = gl;

		this.quad = new ScreenQuad(gl);
		this.sceneTarget = new RenderTarget(gl);
		this.bloom = new BloomPass(gl, this.quad);
		this.sceneProgram = this.buildSceneProgram();
		this.particleProgram = new GlProgram(
			gl,
			PARTICLE_VERTEX,
			PARTICLE_FRAGMENT,
			'particles'
		);
		this.particles = new ParticleField(
			gl,
			this.settings.particles * DENSITY_HEADROOM
		);

		this.timeline.setSections(this.profile.timeline ?? []);
		this.fakeAudio.setSections(this.profile.timeline ?? []);
		this.ambient.setBase(0.3 + this.profile.environment.darkness * 0.15);

		this.resize();
		document.addEventListener('visibilitychange', this.onVisibility);
	}

	// --- configuration ----------------------------------------------------

	public setProfile(profile: SongVisualProfile): void {
		this.profile = profile;
		this.palette = this.readPalette(profile);
		this.seed = seedFrom(profile.id);
		this.timeline.setSections(profile.timeline ?? []);
		this.fakeAudio.setSections(profile.timeline ?? []);
		this.ambient.setBase(0.3 + profile.environment.darkness * 0.15);
	}

	public setMode(mode: VisualInputMode): void {
		this.mode = mode;
	}

	public setQuality(quality: VisualQuality): void {
		if (quality === this.quality) {
			return;
		}
		this.quality = quality;
		this.settings = QUALITY[quality];

		// The octave count is a compile-time define, so the scene program and
		// the particle buffer are rebuilt — once, on a setting change, never
		// inside the loop.
		this.sceneProgram.dispose();
		this.sceneProgram = this.buildSceneProgram();
		this.particles.dispose();
		this.particles = new ParticleField(
			this.gl,
			this.settings.particles * DENSITY_HEADROOM
		);
		this.resize();
	}

	/** Playback position in seconds; drives timeline mode and the simulator. */
	public setPosition(seconds: number): void {
		this.position = Math.max(0, seconds);
		this.timeline.setPosition(this.position);
	}

	/** Pins the look to one section, whatever the controller reports. */
	public setSection(section: SongSection | null): void {
		this.sectionOverride = section;
	}

	public setOverrides(overrides: VisualOverrides | null): void {
		this.overrides = overrides;
	}

	/** Feeds real analyser output into audio-reactive mode. */
	public setAudioFeatures(features: AudioFeatures | null): void {
		this.features = features;
	}

	/** Generates plausible audio instead, for testing without provider access. */
	public setSimulateAudio(simulate: boolean): void {
		this.simulateAudio = simulate;
	}

	/**
	 * Reads features straight off a live analyser. Preferred over
	 * `setAudioFeatures` because the engine can then sample in its own loop
	 * rather than depending on the caller's.
	 */
	public setAnalyser(analyser: AnalyserNode | null): void {
		this.analyserAudio.setAnalyser(analyser);
	}

	/** Whether audio-reactive mode has anything to react to right now. */
	public get hasAudio(): boolean {
		return (
			this.simulateAudio ||
			this.analyserAudio.available ||
			!!this.features
		);
	}

	// --- lifecycle ---------------------------------------------------------

	public start(): void {
		if (this.running) {
			return;
		}
		this.running = true;
		this.last = performance.now();
		this.handle = requestAnimationFrame(this.tick);
	}

	public stop(): void {
		this.running = false;
		cancelAnimationFrame(this.handle);
	}

	public dispose(): void {
		this.stop();
		document.removeEventListener('visibilitychange', this.onVisibility);
		this.sceneProgram.dispose();
		this.particleProgram.dispose();
		this.particles.dispose();
		this.bloom.dispose();
		this.sceneTarget.dispose();
		this.quad.dispose();
	}

	/** Matches the drawing buffer to the canvas box; safe to call often. */
	public resize(): void {
		const ratio = Math.min(
			window.devicePixelRatio || 1,
			this.settings.pixelRatio
		);
		const scale = ratio * this.settings.renderScale;
		const width = Math.max(1, Math.round(this.canvas.clientWidth * scale));
		const height = Math.max(
			1,
			Math.round(this.canvas.clientHeight * scale)
		);

		if (width === this.width && height === this.height) {
			return;
		}
		this.width = width;
		this.height = height;
		this.canvas.width = width;
		this.canvas.height = height;
		this.sceneTarget.resize(width, height);
		this.bloom.resize(width, height);
	}

	// --- the loop ----------------------------------------------------------

	private readonly tick = (now: number) => {
		if (!this.running) {
			return;
		}
		this.handle = requestAnimationFrame(this.tick);

		// A tab that was in the background must not fast-forward the scene.
		const seconds = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
		this.last = now;
		if (document.hidden || seconds === 0) {
			return;
		}

		this.elapsed += seconds;
		this.fps += (1 / seconds - this.fps) * 0.05;

		this.step(seconds);
		this.draw();
		this.onFrame?.(this.state, this.fps);
	};

	private controller(): VisualController {
		switch (this.mode) {
			case 'timeline':
				return this.timeline;
			case 'audio-reactive':
				return this.audioReactive;
			default:
				return this.ambient;
		}
	}

	private step(seconds: number): void {
		if (this.mode === 'audio-reactive') {
			const features = this.simulateAudio
				? this.fakeAudio.sample(seconds, this.position)
				: (this.analyserAudio.sample(seconds) ?? this.features);
			if (features) {
				this.audioReactive.setFeatures(features);
			}
		}

		const signal = this.controller().update(seconds, this.elapsed);
		const section = this.sectionOverride ?? signal.section;

		easeVisualState(
			this.state,
			targetVisualState(this.profile, signal.intensity, section),
			seconds
		);
		applyOverrides(this.state, this.overrides);

		// A beat rises instantly and is gone within about a third of a second.
		this.pulse = Math.max(signal.pulse, this.pulse - seconds * 3.2);
		this.state.pulse = this.pulse;

		this.phase += seconds * this.state.particleSpeed * 0.1;
	}

	/** Where the camera sits this frame, shared by the scene and the embers. */
	private camera(): { x: number; y: number; zoom: number } {
		const amount = this.state.camera;
		const t = this.elapsed * 0.05;
		let x = 0;
		let y = 0;
		let zoom = 1;

		switch (this.profile.camera.movement) {
			case 'static':
				break;
			case 'slow-zoom':
				zoom = 1 - 0.09 * amount * Math.sin(this.elapsed * 0.035);
				x = Math.sin(t * 0.4) * 0.03 * amount;
				break;
			case 'orbit':
				x = Math.cos(t * 0.6) * 0.12 * amount;
				y = Math.sin(t * 0.6) * 0.05 * amount;
				break;
			case 'slow-drift':
			default:
				x =
					(Math.sin(t) + Math.sin(t * 0.37 + 1.7) * 0.5) *
					0.11 *
					amount;
				y = Math.sin(t * 0.23 + 0.4) * 0.04 * amount;
				zoom = 1 - 0.04 * amount * Math.sin(this.elapsed * 0.043);
				break;
		}

		// The shake is a separate, much faster hand on the camera, and only
		// sections that asked for it get any.
		const shake = this.state.shake * 0.005;
		x += (noise(this.elapsed * 9) - 0.5) * shake;
		y += (noise(this.elapsed * 8.3 + 7) - 0.5) * shake;

		return { x, y, zoom };
	}

	private draw(): void {
		const { gl, state } = this;
		const camera = this.camera();
		const useBloom = this.settings.bloom && state.glow > 0.05;

		if (useBloom) {
			this.sceneTarget.bind();
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, this.width, this.height);
		}

		gl.disable(gl.BLEND);
		const scene = this.sceneProgram;
		scene.use();
		scene.vec2('uResolution', this.width, this.height);
		scene.float('uTime', this.elapsed);
		scene.float('uSeed', this.seed);
		scene.float('uIntensity', state.intensity);
		scene.float('uFog', state.fog);
		scene.float('uFogSpeed', state.fogSpeed);
		scene.float('uDarkness', state.darkness);
		scene.float('uLight', state.light);
		scene.float('uGlow', state.glow);
		scene.float('uFlicker', state.flicker);
		scene.float('uVignette', state.vignette);
		scene.float('uSurreal', state.surreal);
		scene.float('uPulse', state.pulse);
		scene.vec2('uCam', camera.x, camera.y);
		scene.float('uZoom', camera.zoom);
		scene.vec3('uBackground', this.palette.background);
		scene.vec3('uPrimary', this.palette.primary);
		scene.vec3('uSecondary', this.palette.secondary);
		scene.vec3('uAccent', this.palette.accent);
		this.quad.draw();

		this.drawParticles(camera);

		if (useBloom) {
			this.bloom.render(
				this.sceneTarget.texture,
				clamp(state.glow * 0.7, 0, 1.2),
				this.width,
				this.height
			);
		}
	}

	private drawParticles(camera: { x: number; y: number }): void {
		const { gl, state } = this;
		const type = this.profile.particles.type;
		const count = Math.round(
			this.settings.particles * clamp(state.particleDensity, 0, 1.6)
		);
		if (count <= 0) {
			return;
		}

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

		const colours = this.particleColours();
		const program = this.particleProgram;
		program.use();
		program.vec2('uResolution', this.width, this.height);
		program.float('uTime', this.elapsed);
		program.float('uPhase', this.phase);
		program.float('uSize', type === 'dust' ? 4.5 : 7.5);
		program.float('uSway', type === 'rain' || type === 'snow' ? 0.2 : 1);
		program.float('uRise', type === 'rain' || type === 'snow' ? 0 : 1);
		program.vec2('uCam', camera.x, camera.y);
		program.float('uGlow', state.glow);
		program.vec3('uCore', colours.core);
		program.vec3('uEdge', colours.edge);
		this.particles.draw(count);

		gl.disable(gl.BLEND);
	}

	private particleColours(): { core: Rgb; edge: Rgb } {
		const { accent, primary, secondary } = this.palette;
		const white: Rgb = [1, 1, 1];

		switch (this.profile.particles.type) {
			case 'energy':
				return { core: mixRgb(secondary, white, 0.45), edge: accent };
			case 'rain':
			case 'snow':
				return {
					core: mixRgb(secondary, white, 0.6),
					edge: scaleRgb(secondary, 0.5),
				};
			case 'dust':
				return {
					core: mixRgb(secondary, white, 0.3),
					edge: scaleRgb(secondary, 0.4),
				};
			case 'embers':
			default:
				return { core: mixRgb(accent, white, 0.45), edge: primary };
		}
	}

	private readPalette(profile: SongVisualProfile) {
		return {
			background: hexToRgb(profile.palette.background),
			primary: hexToRgb(profile.palette.primary),
			secondary: hexToRgb(profile.palette.secondary),
			accent: hexToRgb(profile.palette.accent),
		};
	}

	private buildSceneProgram(): GlProgram {
		// The octave count has to be a constant for the loop to unroll, so it
		// is injected as a define rather than passed as a uniform.
		const source = INDUSTRIAL_SCENE_FRAGMENT.replace(
			'precision highp float;',
			`precision highp float;\n#define FBM_OCTAVES ${this.settings.octaves}`
		);
		return new GlProgram(
			this.gl,
			FULLSCREEN_VERTEX,
			source,
			'industrial scene'
		);
	}
}
