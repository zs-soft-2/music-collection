import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	Injector,
	NgZone,
	afterNextRender,
	effect,
	inject,
	input,
	output,
	viewChild,
} from '@angular/core';

import {
	AudioFeatures,
	SongSection,
	SongVisualProfile,
	VisualEngine,
	VisualInputMode,
	VisualOverrides,
	VisualQuality,
	VisualState,
} from '@music-collection/ui/visual-engine';

export interface VisualFrame {
	state: Readonly<VisualState>;
	fps: number;
}

/**
 * Puts the visual engine on the page and keeps it in step with its inputs.
 * Everything it does is rendering; it holds no state of its own beyond whether
 * the browser could open a context at all.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-visual-scene',
	template: '<canvas #canvas aria-hidden="true"></canvas>',
	styles: `
		:host {
			display: block;
			position: relative;
			overflow: hidden;
			background: #05070e;
		}

		canvas {
			display: block;
			width: 100%;
			height: 100%;
		}
	`,
})
export class VisualSceneComponent {
	public readonly profile = input.required<SongVisualProfile>();
	public readonly mode = input<VisualInputMode>('ambient');
	public readonly quality = input<VisualQuality>('high');
	/** Playback position in seconds; only timeline mode reads it. */
	public readonly positionSeconds = input(0);
	/** Pins the look to one section, whatever the mode would have chosen. */
	public readonly section = input<SongSection | null>(null);
	public readonly overrides = input<VisualOverrides | null>(null);
	public readonly audioFeatures = input<AudioFeatures | null>(null);
	/** A live analyser, when the app managed to capture the tab's sound. */
	public readonly analyser = input<AnalyserNode | null>(null);
	public readonly simulateAudio = input(false);
	/** Stops the loop without tearing the context down. */
	public readonly paused = input(false);

	public readonly frame = output<VisualFrame>();
	/** Fires once when WebGL2 is unavailable, so the caller can fall back. */
	public readonly unsupported = output<string>();

	private readonly canvas =
		viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
	private readonly host = inject(ElementRef<HTMLElement>);
	private readonly injector = inject(Injector);
	private readonly destroyRef = inject(DestroyRef);
	private readonly zone = inject(NgZone);

	private engine: VisualEngine | null = null;

	public constructor() {
		afterNextRender(() => this.open());
	}

	private open(): void {
		// The render loop must not run inside Angular: sixty frames a second
		// of zone activity would put the whole app through change detection
		// for a background animation. Signals written from outside still mark
		// their readers dirty, so the debug panel keeps updating.
		try {
			this.engine = this.zone.runOutsideAngular(
				() =>
					new VisualEngine({
						canvas: this.canvas().nativeElement,
						profile: this.profile(),
						mode: this.mode(),
						quality: this.quality(),
						onFrame: (state, fps) =>
							this.frame.emit({ state, fps }),
					})
			);
		} catch (error) {
			this.unsupported.emit(
				error instanceof Error ? error.message : 'No WebGL2 context.'
			);
			return;
		}

		const observer = new ResizeObserver(() => this.engine?.resize());
		observer.observe(this.host.nativeElement);

		this.destroyRef.onDestroy(() => {
			observer.disconnect();
			this.engine?.dispose();
			this.engine = null;
		});

		this.watchInputs();
		this.engine.resize();
		this.zone.runOutsideAngular(() => this.engine?.start());
	}

	/**
	 * One effect per input rather than one for all of them: a slider dragged in
	 * the debug panel should not make the engine rebuild its shaders.
	 */
	private watchInputs(): void {
		const on = (run: () => void) =>
			effect(run, { injector: this.injector });

		on(() => this.engine?.setProfile(this.profile()));
		on(() => this.engine?.setMode(this.mode()));
		on(() => this.engine?.setQuality(this.quality()));
		on(() => this.engine?.setPosition(this.positionSeconds()));
		on(() => this.engine?.setSection(this.section()));
		on(() => this.engine?.setOverrides(this.overrides()));
		on(() => this.engine?.setAudioFeatures(this.audioFeatures()));
		on(() => this.engine?.setAnalyser(this.analyser()));
		on(() => this.engine?.setSimulateAudio(this.simulateAudio()));
		on(() => {
			const paused = this.paused();
			this.zone.runOutsideAngular(() =>
				paused ? this.engine?.stop() : this.engine?.start()
			);
		});
	}
}
