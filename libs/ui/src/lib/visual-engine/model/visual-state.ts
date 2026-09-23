/**
 * What one frame looks like, after the profile, the active section and any
 * manual overrides have been folded into a single set of numbers. This is the
 * only thing the renderer reads.
 */
export interface VisualState {
	/** The one value everything else is derived from. */
	intensity: number;

	fog: number;
	fogSpeed: number;
	darkness: number;

	particleDensity: number;
	particleSpeed: number;

	camera: number;
	light: number;

	glow: number;
	flicker: number;
	shake: number;
	vignette: number;

	/** Lifts the scene towards the surreal during a solo. */
	surreal: number;
	/** A short swell on a beat, 0..1. */
	pulse: number;
}

/** Every knob the debug panel can pin to a fixed value. */
export type VisualOverrides = Partial<
	Omit<VisualState, 'pulse'> & { intensity: number }
>;
