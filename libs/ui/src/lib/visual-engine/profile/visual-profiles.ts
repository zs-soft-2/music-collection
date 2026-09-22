import { SongVisualProfile, VisualTimelineSection } from '../model';
import { deriveVisualProfile } from './derived-profile';

/**
 * The demo timeline: a little under four and a half minutes, shaped like a
 * thrash track rather than tied to any particular recording.
 */
export const DEMO_TIMELINE: VisualTimelineSection[] = [
	{ start: 0, end: 25, section: 'intro', intensity: 0.15 },
	{ start: 25, end: 58, section: 'verse', intensity: 0.42 },
	{ start: 58, end: 85, section: 'chorus', intensity: 0.85 },
	{ start: 85, end: 115, section: 'verse', intensity: 0.45 },
	{ start: 115, end: 145, section: 'chorus', intensity: 0.85 },
	{ start: 145, end: 170, section: 'breakdown', intensity: 0.35 },
	{ start: 170, end: 210, section: 'solo', intensity: 0.9 },
	{ start: 210, end: 240, section: 'chorus', intensity: 0.88 },
	{ start: 240, end: 267, section: 'outro', intensity: 0.2 },
];

/**
 * An original reading of a dark, mechanical thrash record: a city of furnaces
 * under a low sky. Nothing here reproduces anyone's artwork — it is a set of
 * numbers describing weather, light and dirt.
 */
export const THE_NEW_ORDER_PROFILE: SongVisualProfile = {
	id: 'testament-the-new-order-1988',

	artist: 'Testament',
	album: 'The New Order',
	song: 'The New Order',
	year: 1988,

	genre: ['thrash metal'],

	mood: [
		'dark',
		'ominous',
		'aggressive',
		'cold',
		'mechanical',
		'apocalyptic',
	],
	concepts: [
		'control',
		'society',
		'power',
		'future',
		'conflict',
		'dystopia',
		'industrial decay',
	],

	palette: {
		background: '#05070e',
		primary: '#c4351b',
		secondary: '#46708c',
		accent: '#ff8f2e',
	},

	environment: {
		type: 'industrial',
		fog: 0.62,
		darkness: 0.55,
	},

	particles: {
		type: 'embers',
		density: 0.5,
		speed: 0.55,
	},

	camera: {
		movement: 'slow-drift',
		intensity: 0.35,
	},

	effects: {
		glow: 0.75,
		flicker: 0.6,
		shake: 0.25,
		vignette: 0.7,
	},

	timeline: DEMO_TIMELINE,
};

/** What a song gets when nothing at all is known about it. */
export const DEFAULT_VISUAL_PROFILE: SongVisualProfile = {
	...deriveVisualProfile({}),
	id: 'default',
};

const CATALOG: SongVisualProfile[] = [THE_NEW_ORDER_PROFILE];

/**
 * Picks the profile for a song: a hand-authored one when we have it, otherwise
 * one derived from the song itself. This is the seam an AI service would take
 * over later — it would return the same shape, and nothing downstream changes.
 */
export function resolveVisualProfile(song: {
	artist?: string | null;
	album?: string | null;
	song?: string | null;
	genre?: string[] | null;
	year?: number | null;
}): SongVisualProfile {
	const artist = (song.artist ?? '').trim().toLowerCase();
	const title = (song.song ?? '').trim().toLowerCase();

	const authored = CATALOG.find(
		(profile) =>
			profile.artist.toLowerCase() === artist &&
			profile.song.toLowerCase() === title
	);

	return authored ?? deriveVisualProfile(song);
}
