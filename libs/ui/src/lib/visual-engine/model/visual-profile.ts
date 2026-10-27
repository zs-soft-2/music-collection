/**
 * Where the visual engine takes its intensity from.
 *
 * `ambient` always works: the scene runs on its own clock and never needs the
 * player. `timeline` follows the playback position through the profile's song
 * sections. `audio-reactive` consumes normalised audio features, whether those
 * come from a real analyser or from a simulation.
 */
export type VisualInputMode = 'ambient' | 'timeline' | 'audio-reactive';

/** Trades shader work and particle count for frame rate. */
export type VisualQuality = 'low' | 'medium' | 'high';

/** The dramatic states a song moves through. */
export type SongSection =
	'intro' | 'verse' | 'build' | 'chorus' | 'breakdown' | 'solo' | 'outro';

/**
 * The kind of world the scene builds. Every one of these is a different
 * picture rather than a different grade of one picture: what stands on the
 * horizon, what is in the sky and what the ground is made of all change with
 * it. See `WORLDS` for what each one has.
 */
export type EnvironmentType =
	| 'industrial'
	| 'urban'
	| 'forest'
	| 'swamp'
	| 'cathedral'
	| 'citadel'
	| 'space'
	| 'desert'
	| 'coast'
	| 'warehouse'
	| 'abstract'
	| 'nature'
	| 'custom';

export type ParticleType = 'embers' | 'dust' | 'rain' | 'snow' | 'energy';

export type CameraMovement = 'static' | 'slow-drift' | 'slow-zoom' | 'orbit';

/** One stretch of the song, in seconds from its start. */
export interface VisualTimelineSection {
	start: number;
	end: number;
	section: SongSection;
	intensity: number;
}

/** CSS hex colours; the engine converts them to shader vectors once. */
export interface VisualPalette {
	background: string;
	primary: string;
	secondary: string;
	accent: string;
}

/**
 * Everything the engine needs to know about one song, and nothing about how it
 * is rendered. An AI service could later produce this JSON from artist, album,
 * year, genre and a lyric analysis without the renderer changing at all.
 */
export interface SongVisualProfile {
	id: string;
	/**
	 * Which world the song plays in, rather than which song it is. Two tracks
	 * of one record share it, so the city behind them is the same city, while
	 * their differing `id` still keeps them from breathing in lockstep.
	 * Falls back to `id` when a profile does not say.
	 */
	world?: string;

	artist: string;
	album: string;
	song: string;
	year?: number;

	genre: string[];

	mood: string[];
	concepts: string[];

	palette: VisualPalette;

	environment: {
		type: EnvironmentType;
		/** 0..1 how much the air swallows the distance. */
		fog: number;
		/** 0..1 how far the whole scene sits from daylight. */
		darkness: number;
	};

	particles: {
		type: ParticleType;
		/** 0..1, scaled by quality into an actual count. */
		density: number;
		speed: number;
	};

	camera: {
		movement: CameraMovement;
		intensity: number;
	};

	effects: {
		glow: number;
		flicker: number;
		shake: number;
		vignette: number;
	};

	/**
	 * How hard this track runs through its world, 0..1. Ambient mode has
	 * nothing else to tell two tracks of one record apart: they share a
	 * skyline, a palette and the weather, so this is what makes one of them
	 * sit low and dark and the next one burn. Defaults to the middle.
	 */
	energy?: number;

	timeline?: VisualTimelineSection[];
}
