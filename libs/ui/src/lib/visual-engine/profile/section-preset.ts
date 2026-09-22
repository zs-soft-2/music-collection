import { SongSection } from '../model';

/**
 * How a section bends the profile. `intensity` is the section's own target;
 * the rest are multipliers applied on top of what the intensity already did,
 * so a chorus can be busy with particles while a breakdown is busy with fog.
 */
export interface SectionPreset {
	intensity: number;
	fog: number;
	fogSpeed: number;
	particles: number;
	light: number;
	camera: number;
	glow: number;
	shake: number;
	surreal: number;
}

export const SECTION_PRESETS: Record<SongSection, SectionPreset> = {
	intro: {
		intensity: 0.15,
		fog: 1.35,
		fogSpeed: 0.6,
		particles: 0.35,
		light: 0.5,
		camera: 0.6,
		glow: 0.7,
		shake: 0,
		surreal: 0,
	},
	verse: {
		intensity: 0.4,
		fog: 1,
		fogSpeed: 0.9,
		particles: 0.8,
		light: 0.9,
		camera: 0.9,
		glow: 0.9,
		shake: 0.15,
		surreal: 0,
	},
	build: {
		intensity: 0.65,
		fog: 0.95,
		fogSpeed: 1.35,
		particles: 1.15,
		light: 1.1,
		camera: 1.1,
		glow: 1.05,
		shake: 0.4,
		surreal: 0.1,
	},
	chorus: {
		intensity: 0.85,
		fog: 0.8,
		fogSpeed: 1.25,
		particles: 1.2,
		light: 1.3,
		camera: 1.15,
		glow: 1.25,
		shake: 0.5,
		surreal: 0.05,
	},
	breakdown: {
		intensity: 0.35,
		fog: 1.5,
		fogSpeed: 0.7,
		particles: 0.5,
		light: 0.6,
		camera: 0.7,
		glow: 0.8,
		shake: 0.1,
		surreal: 0.15,
	},
	solo: {
		intensity: 0.9,
		fog: 0.85,
		fogSpeed: 1.1,
		particles: 1.1,
		light: 1.35,
		camera: 1,
		glow: 1.4,
		shake: 0.35,
		surreal: 1,
	},
	outro: {
		intensity: 0.2,
		fog: 1.6,
		fogSpeed: 0.5,
		particles: 0.4,
		light: 0.45,
		camera: 0.5,
		glow: 0.6,
		shake: 0,
		surreal: 0,
	},
};
