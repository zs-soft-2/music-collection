import {
	CameraMovement,
	EnvironmentType,
	ParticleType,
	SongVisualProfile,
	VisualPalette,
} from '../model';

/** Inclusive low and high end of a value the song's own numbers pick from. */
type Range = [number, number];

/**
 * The character a song's world has: its palette, what falls through the air,
 * how the camera holds it. Genre chooses a family when we know it; when we do
 * not, the song's own name chooses, so two records never share a look by
 * accident.
 */
interface VisualFamily {
	name: string;
	match: RegExp;
	mood: string[];
	concepts: string[];
	palette: VisualPalette;
	environment: EnvironmentType;
	fog: Range;
	darkness: Range;
	particles: ParticleType[];
	density: Range;
	speed: Range;
	cameras: CameraMovement[];
	glow: Range;
	flicker: Range;
	shake: Range;
	vignette: Range;
}

const FAMILIES: VisualFamily[] = [
	{
		name: 'furnace',
		match: /thrash|death|black metal|heavy metal|hardcore|punk|speed/i,
		mood: ['dark', 'aggressive', 'mechanical', 'cold'],
		concepts: ['power', 'conflict', 'industrial decay'],
		palette: {
			background: '#05070e',
			primary: '#c4351b',
			secondary: '#46708c',
			accent: '#ff8f2e',
		},
		environment: 'industrial',
		fog: [0.45, 0.72],
		darkness: [0.45, 0.68],
		particles: ['embers', 'embers', 'dust'],
		density: [0.4, 0.62],
		speed: [0.45, 0.7],
		cameras: ['slow-drift', 'slow-zoom'],
		glow: [0.6, 0.85],
		flicker: [0.45, 0.75],
		shake: [0.18, 0.35],
		vignette: [0.6, 0.78],
	},
	{
		name: 'neon',
		match: /synth|wave|electronic|techno|house|ebm|industrial|pop/i,
		mood: ['restless', 'bright', 'synthetic'],
		concepts: ['city', 'speed', 'signal'],
		palette: {
			background: '#07031a',
			primary: '#ff3d9a',
			secondary: '#22d3ee',
			accent: '#a855f7',
		},
		environment: 'urban',
		fog: [0.32, 0.55],
		darkness: [0.35, 0.55],
		particles: ['energy', 'energy', 'rain'],
		density: [0.42, 0.66],
		speed: [0.6, 0.95],
		cameras: ['slow-zoom', 'orbit', 'slow-drift'],
		glow: [0.7, 1],
		flicker: [0.3, 0.6],
		shake: [0.08, 0.22],
		vignette: [0.5, 0.7],
	},
	{
		name: 'haze',
		match: /ambient|classical|jazz|folk|acoustic|soundtrack|new age/i,
		mood: ['still', 'warm', 'distant'],
		concepts: ['memory', 'room', 'evening'],
		palette: {
			background: '#060a0c',
			primary: '#6f8f7a',
			secondary: '#9db7c4',
			accent: '#e6c98c',
		},
		environment: 'abstract',
		fog: [0.58, 0.85],
		darkness: [0.3, 0.5],
		particles: ['dust', 'dust', 'snow'],
		density: [0.25, 0.45],
		speed: [0.18, 0.35],
		cameras: ['slow-drift', 'static', 'slow-zoom'],
		glow: [0.4, 0.65],
		flicker: [0.15, 0.35],
		shake: [0, 0.08],
		vignette: [0.55, 0.75],
	},
	{
		name: 'cobalt',
		match: /prog|psych|space|krautrock|post-rock|art rock/i,
		mood: ['weightless', 'searching', 'vast'],
		concepts: ['distance', 'orbit', 'machinery'],
		palette: {
			background: '#030616',
			primary: '#4f7bd8',
			secondary: '#7fd4c1',
			accent: '#c9a6ff',
		},
		environment: 'space',
		fog: [0.4, 0.66],
		darkness: [0.4, 0.6],
		particles: ['energy', 'dust'],
		density: [0.3, 0.55],
		speed: [0.3, 0.55],
		cameras: ['orbit', 'slow-zoom'],
		glow: [0.6, 0.9],
		flicker: [0.2, 0.45],
		shake: [0.05, 0.18],
		vignette: [0.55, 0.72],
	},
	{
		name: 'rust',
		match: /blues|rock|country|southern|soul|funk|garage/i,
		mood: ['worn', 'warm', 'loose'],
		concepts: ['road', 'smoke', 'wood'],
		palette: {
			background: '#0b0705',
			primary: '#d1782c',
			secondary: '#8a6a4f',
			accent: '#f2c078',
		},
		environment: 'urban',
		fog: [0.4, 0.65],
		darkness: [0.4, 0.6],
		particles: ['dust', 'embers'],
		density: [0.3, 0.5],
		speed: [0.35, 0.6],
		cameras: ['slow-drift', 'slow-zoom'],
		glow: [0.45, 0.7],
		flicker: [0.3, 0.55],
		shake: [0.1, 0.25],
		vignette: [0.6, 0.8],
	},
	{
		name: 'frost',
		match: /doom|gothic|shoegaze|post-punk|darkwave|sludge|drone/i,
		mood: ['heavy', 'grey', 'slow'],
		concepts: ['weight', 'winter', 'ruin'],
		palette: {
			background: '#04070b',
			primary: '#5f7f9c',
			secondary: '#8e9bb0',
			accent: '#d7e3f0',
		},
		environment: 'abstract',
		fog: [0.6, 0.9],
		darkness: [0.5, 0.72],
		particles: ['snow', 'rain', 'dust'],
		density: [0.35, 0.6],
		speed: [0.2, 0.4],
		cameras: ['static', 'slow-drift'],
		glow: [0.4, 0.62],
		flicker: [0.2, 0.4],
		shake: [0, 0.12],
		vignette: [0.65, 0.85],
	},
];

/**
 * A deterministic stream of numbers in 0..1 from a song's identity: the same
 * record always gets the same world back, on any device and after a reload.
 */
function streamFrom(key: string): () => number {
	let state = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		state = Math.imul(state ^ key.charCodeAt(i), 0x01000193) >>> 0;
	}

	// splitmix32, and not a plain linear congruential step, because the very
	// first number out of the stream is the one that picks the family. A weak
	// mixer leaves that first draw correlated with the hash, and then half the
	// bands land in the same world — which is the bug this file exists to fix.
	return () => {
		state = (state + 0x9e3779b9) >>> 0;
		let z = state;
		z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
		z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
		z = (z ^ (z >>> 15)) >>> 0;
		return z / 0x100000000;
	};
}

function hexToHsl(hex: string): [number, number, number] {
	const value = hex.replace('#', '');
	const r = parseInt(value.slice(0, 2), 16) / 255;
	const g = parseInt(value.slice(2, 4), 16) / 255;
	const b = parseInt(value.slice(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const span = max - min;
	if (span === 0) {
		return [0, 0, l];
	}

	const s = l > 0.5 ? span / (2 - max - min) : span / (max + min);
	const h =
		max === r
			? ((g - b) / span + (g < b ? 6 : 0)) * 60
			: max === g
				? ((b - r) / span + 2) * 60
				: ((r - g) / span + 4) * 60;

	return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
	const hue = ((h % 360) + 360) % 360;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = l - c / 2;
	const [r, g, b] =
		hue < 60
			? [c, x, 0]
			: hue < 120
				? [x, c, 0]
				: hue < 180
					? [0, c, x]
					: hue < 240
						? [0, x, c]
						: hue < 300
							? [x, 0, c]
							: [c, 0, x];

	const channel = (value: number) =>
		Math.round(Math.min(Math.max(value + m, 0), 1) * 255)
			.toString(16)
			.padStart(2, '0');

	return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Turns a family colour by a few degrees, without leaving the family. */
function turn(hex: string, degrees: number, saturation: number): string {
	const [h, s, l] = hexToHsl(hex);
	return hslToHex(
		h + degrees,
		Math.min(Math.max(s * saturation, 0), 1),
		Math.min(Math.max(l, 0), 1)
	);
}

/** Trims and lowercases, so "  Testament " and "testament" are one band. */
function key(value: string | null | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

/**
 * What a song gets when no one has authored a profile for it.
 *
 * Three streams, not one, because the three levels do different jobs. The band
 * owns the world and is meant to be recognised: family, environment, the base
 * colours, how the camera is held. The record is the weather in that world —
 * same city, another evening: hue, fog, dark, what falls through the air. The
 * track only decides how it is played through: tempo, how much the camera
 * moves, how much the light works. So two records of one band are relatives
 * rather than strangers, and two tracks of one record are the same place.
 */
export function deriveVisualProfile(song: {
	artist?: string | null;
	album?: string | null;
	song?: string | null;
	genre?: string[] | null;
	year?: number | null;
}): SongVisualProfile {
	const artist = (song.artist ?? '').trim();
	const album = (song.album ?? '').trim();
	const title = (song.song ?? '').trim();
	const genres = song.genre ?? [];

	const bandKey = key(artist) || 'unknown band';
	const recordKey = `${bandKey}|${key(album) || 'unknown record'}`;
	const trackKey = `${recordKey}|${key(title) || 'unknown track'}`;

	const band = streamFrom(bandKey);
	const record = streamFrom(recordKey);
	const track = streamFrom(trackKey);

	const span = (stream: () => number, range: Range) =>
		range[0] + stream() * (range[1] - range[0]);
	const oneOf = <T>(stream: () => number, items: readonly T[]): T =>
		items[Math.floor(stream() * items.length) % items.length];

	// The roll is drawn either way, so the stream stays in step whether or not
	// the genre had something to say.
	const roll = band();
	const family =
		FAMILIES.find(({ match }) =>
			genres.some((genre) => match.test(genre))
		) ?? FAMILIES[Math.floor(roll * FAMILIES.length)];

	// The band turns the family's colours the furthest — that turn is what one
	// recognises. The record only moves a few degrees off its band, so it
	// reads as another night in the same city rather than another city.
	const bandDegrees = (band() - 0.5) * 30;
	const recordDegrees = bandDegrees + (record() - 0.5) * 12;
	const saturation = (0.88 + band() * 0.24) * (0.94 + record() * 0.12);

	return {
		id: `derived:${trackKey}`,
		world: `derived:${recordKey}`,

		artist,
		album,
		song: title,
		year: song.year ?? undefined,

		genre: genres,
		mood: family.mood,
		concepts: family.concepts,

		palette: {
			background: turn(family.palette.background, bandDegrees * 0.5, 1),
			primary: turn(family.palette.primary, recordDegrees, saturation),
			secondary: turn(
				family.palette.secondary,
				-recordDegrees,
				saturation
			),
			accent: turn(
				family.palette.accent,
				recordDegrees * 0.6,
				saturation
			),
		},

		environment: {
			type: family.environment,
			fog: span(record, family.fog),
			darkness: span(record, family.darkness),
		},

		particles: {
			type: oneOf(record, family.particles),
			density: span(record, family.density),
			// The tempo is the track's: it is what the ambient breath runs on,
			// so two tracks of one record never swell together.
			speed: span(track, family.speed),
		},

		camera: {
			movement: oneOf(band, family.cameras),
			intensity: 0.2 + track() * 0.35,
		},

		// The track's own level. Across a record this is the only thing that
		// separates one song from the next, so it takes a wide swing.
		energy: 0.22 + track() * 0.62,

		effects: {
			glow: span(record, family.glow),
			flicker: span(track, family.flicker),
			shake: span(track, family.shake),
			vignette: span(band, family.vignette),
		},
	};
}
