import {
	SongSection,
	SongVisualProfile,
	VisualOverrides,
	VisualState,
} from '../model';
import { SECTION_PRESETS, SectionPreset } from '../profile/section-preset';
import { approach, clamp, lerp } from './math';

/** Used when no section is driving the scene, as in ambient mode. */
const NEUTRAL: SectionPreset = {
	intensity: 0.35,
	fog: 1,
	fogSpeed: 1,
	particles: 1,
	light: 1,
	camera: 1,
	glow: 1,
	shake: 1,
	surreal: 0,
};

export function neutralVisualState(): VisualState {
	return {
		intensity: 0,
		fog: 0.6,
		fogSpeed: 0.3,
		darkness: 0.6,
		particleDensity: 0.3,
		particleSpeed: 0.3,
		camera: 0.1,
		light: 0.25,
		glow: 0.5,
		flicker: 0.4,
		shake: 0,
		vignette: 0.7,
		surreal: 0,
		pulse: 0,
	};
}

/**
 * Everything the renderer needs, derived from one intensity value. Note what is
 * NOT here: no effect reads audio directly, and quiet sections get *more* fog
 * and *more* darkness rather than simply less of everything.
 */
export function targetVisualState(
	profile: SongVisualProfile,
	intensity: number,
	section: SongSection | null
): VisualState {
	const preset = section ? SECTION_PRESETS[section] : NEUTRAL;
	const level = clamp(intensity, 0, 1);

	return {
		intensity: level,

		fog: clamp(
			profile.environment.fog * preset.fog * lerp(1.2, 0.78, level),
			0,
			1.6
		),
		// Even a quiet section has weather: a floor here is the difference
		// between a slow scene and a photograph.
		fogSpeed: lerp(0.45, 1, level) * preset.fogSpeed,
		darkness: clamp(
			profile.environment.darkness * lerp(1.15, 0.7, level),
			0,
			1
		),

		particleDensity: clamp(
			profile.particles.density *
				lerp(0.55, 1.6, level) *
				preset.particles,
			0,
			1.6
		),
		particleSpeed: profile.particles.speed * lerp(0.7, 2, level),

		camera: profile.camera.intensity * lerp(0.5, 1, level) * preset.camera,
		light: lerp(0.2, 1.5, level) * preset.light,

		glow: profile.effects.glow * lerp(0.5, 1.4, level) * preset.glow,
		flicker: profile.effects.flicker,
		shake: profile.effects.shake * preset.shake * level,
		vignette: profile.effects.vignette * lerp(1.1, 0.85, level),

		surreal: preset.surreal,
		pulse: 0,
	};
}

/** Fields that ease towards their target rather than snapping to it. */
const SMOOTHED = [
	'intensity',
	'fog',
	'fogSpeed',
	'darkness',
	'particleDensity',
	'particleSpeed',
	'camera',
	'light',
	'glow',
	'flicker',
	'shake',
	'vignette',
	'surreal',
] as const;

/**
 * How long each field takes to travel halfway to its target. Light and glow
 * answer quickly; fog and particle density are heavy and take their time, which
 * is what makes a section change feel like weather rather than a cut.
 */
const HALF_LIFE: Record<(typeof SMOOTHED)[number], number> = {
	intensity: 1.1,
	fog: 2.6,
	fogSpeed: 1.8,
	darkness: 2,
	particleDensity: 2.2,
	particleSpeed: 1.4,
	camera: 2,
	light: 0.7,
	glow: 0.8,
	flicker: 1,
	shake: 0.6,
	vignette: 1.5,
	surreal: 1.6,
};

/** Eases `current` towards `target` in place and returns it. */
export function easeVisualState(
	current: VisualState,
	target: VisualState,
	seconds: number
): VisualState {
	for (const key of SMOOTHED) {
		current[key] = approach(
			current[key],
			target[key],
			seconds,
			HALF_LIFE[key]
		);
	}
	return current;
}

/**
 * Applies the debug panel's pinned values. These bypass the smoothing on
 * purpose: when someone drags a slider they want to see it, not wait for it.
 */
export function applyOverrides(
	state: VisualState,
	overrides: VisualOverrides | null
): VisualState {
	if (!overrides) {
		return state;
	}
	for (const [key, value] of Object.entries(overrides)) {
		if (typeof value === 'number') {
			(state as unknown as Record<string, number>)[key] = value;
		}
	}
	return state;
}
