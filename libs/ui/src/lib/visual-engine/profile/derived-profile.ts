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

/**
 * The families, in the order they are tried. A record's styles are matched
 * against them from the top, so the more particular reading wins: melodic
 * death goes to the cold sea rather than to the charnel house, and blackened
 * doom goes to the flooded nave rather than to the frozen wood.
 *
 * The vocabulary is the one this shelf actually uses — `StyleEnum` is forty-odd
 * metal and rock subgenres — which is why there is no family for techno and
 * four of them for kinds of dark. A taxonomy built for music in general put
 * two thirds of this collection in one world.
 */
const FAMILIES: VisualFamily[] = [
	{
		// Melodic death and its neighbours: the cold end of the North Sea.
		name: 'ironcoast',
		match: /melodic death|gothenburg|melodic doom|viking/i,
		mood: ['cold', 'wide', 'melancholic'],
		concepts: ['sea', 'iron', 'distance'],
		palette: {
			background: '#04080f',
			primary: '#3f6f97',
			secondary: '#7fa3b8',
			accent: '#cfe3ea',
		},
		environment: 'coast',
		fog: [0.5, 0.78],
		darkness: [0.42, 0.62],
		particles: ['rain', 'snow', 'dust'],
		density: [0.35, 0.6],
		speed: [0.35, 0.6],
		cameras: ['slow-drift', 'slow-zoom'],
		glow: [0.5, 0.72],
		flicker: [0.25, 0.45],
		shake: [0.08, 0.2],
		vignette: [0.6, 0.78],
	},
	{
		// Doom and gothic: a nave with the roof gone and the floor flooded.
		name: 'sepulchre',
		match: /doom|gothic|sludge|drone|funeral|stoner/i,
		mood: ['heavy', 'slow', 'grieving'],
		concepts: ['weight', 'ruin', 'water'],
		palette: {
			background: '#05060b',
			primary: '#6a5f8f',
			secondary: '#6e7f92',
			accent: '#c9b98c',
		},
		environment: 'cathedral',
		fog: [0.58, 0.88],
		darkness: [0.5, 0.72],
		particles: ['rain', 'dust'],
		density: [0.35, 0.62],
		speed: [0.2, 0.4],
		cameras: ['static', 'slow-drift', 'slow-zoom'],
		glow: [0.42, 0.68],
		flicker: [0.2, 0.42],
		shake: [0, 0.12],
		vignette: [0.66, 0.86],
	},
	{
		// Progressive and avant-garde: no ground under it at all.
		name: 'orbit',
		match: /progressive|prog|avantgarde|avant-garde|psychedel|kraut|post-rock|art rock|space|technical thrash/i,
		mood: ['weightless', 'searching', 'vast'],
		concepts: ['distance', 'orbit', 'machinery'],
		palette: {
			background: '#030616',
			primary: '#4f7bd8',
			secondary: '#7fd4c1',
			accent: '#c9a6ff',
		},
		environment: 'space',
		fog: [0.3, 0.55],
		darkness: [0.38, 0.58],
		particles: ['energy', 'dust'],
		density: [0.3, 0.55],
		speed: [0.3, 0.55],
		cameras: ['orbit', 'slow-zoom'],
		glow: [0.65, 0.95],
		flicker: [0.2, 0.45],
		shake: [0.05, 0.18],
		vignette: [0.5, 0.7],
	},
	{
		// Black, pagan and folk metal: a frozen wood under a whole sky.
		name: 'frostwood',
		match: /black|pagan|celtic|folk|epic heathen/i,
		mood: ['frozen', 'remote', 'ritual'],
		concepts: ['winter', 'forest', 'night'],
		palette: {
			background: '#03060a',
			primary: '#2f6a6b',
			secondary: '#8fb8c9',
			accent: '#e4f0f7',
		},
		environment: 'forest',
		fog: [0.42, 0.7],
		darkness: [0.52, 0.75],
		particles: ['snow', 'snow', 'dust'],
		density: [0.4, 0.68],
		speed: [0.25, 0.5],
		cameras: ['slow-drift', 'static'],
		glow: [0.5, 0.78],
		flicker: [0.25, 0.5],
		shake: [0.05, 0.18],
		vignette: [0.62, 0.82],
	},
	{
		// Thrash and speed: the city of furnaces this engine started from.
		name: 'furnace',
		match: /thrash|speed|groove|teutonic|bay area|crossover/i,
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
		// Death metal and grind: standing water, dead trees, no horizon left.
		name: 'charnel',
		match: /death|grind|brutal|gore|deathcore/i,
		mood: ['rotten', 'airless', 'relentless'],
		concepts: ['swamp', 'decay', 'bone'],
		palette: {
			background: '#060806',
			primary: '#6b7a2f',
			secondary: '#4d5f50',
			accent: '#c2b46a',
		},
		environment: 'swamp',
		fog: [0.6, 0.9],
		darkness: [0.55, 0.78],
		particles: ['dust', 'rain'],
		density: [0.45, 0.72],
		speed: [0.3, 0.55],
		cameras: ['slow-drift', 'static'],
		glow: [0.4, 0.62],
		flicker: [0.3, 0.55],
		shake: [0.2, 0.4],
		vignette: [0.68, 0.88],
	},
	{
		// Power, symphonic and traditional heavy metal: spires on a ridge.
		name: 'citadel',
		match: /power|symphonic|heavy metal|new wave of british|nwobhm|traditional/i,
		mood: ['soaring', 'bright', 'ceremonial'],
		concepts: ['height', 'banner', 'journey'],
		palette: {
			background: '#050a16',
			primary: '#c8912f',
			secondary: '#5f8fc4',
			accent: '#ffe3a3',
		},
		environment: 'citadel',
		fog: [0.32, 0.58],
		darkness: [0.34, 0.55],
		particles: ['snow', 'energy', 'dust'],
		density: [0.28, 0.5],
		speed: [0.35, 0.62],
		cameras: ['slow-zoom', 'slow-drift', 'orbit'],
		glow: [0.62, 0.92],
		flicker: [0.25, 0.5],
		shake: [0.08, 0.22],
		vignette: [0.52, 0.72],
	},
	{
		// Metalcore, hardcore, grunge, alternative: a room, not a landscape.
		name: 'grit',
		match: /metalcore|hardcore|punk|alternative|grunge|nu metal|industrial|rap/i,
		mood: ['close', 'raw', 'lit from one side'],
		concepts: ['room', 'concrete', 'crowd'],
		palette: {
			background: '#080807',
			primary: '#b8482a',
			secondary: '#6d7377',
			accent: '#e8d9b0',
		},
		environment: 'warehouse',
		fog: [0.4, 0.68],
		darkness: [0.46, 0.68],
		particles: ['dust', 'embers'],
		density: [0.4, 0.66],
		speed: [0.4, 0.7],
		cameras: ['slow-drift', 'static', 'slow-zoom'],
		glow: [0.55, 0.85],
		flicker: [0.5, 0.8],
		shake: [0.22, 0.42],
		vignette: [0.62, 0.82],
	},
	{
		// Glam, funk and anything with a sign on it: a wet street at night.
		name: 'boulevard',
		match: /glam|funk|synth|wave|electronic|techno|house|pop|disco|sleaze/i,
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
		particles: ['rain', 'energy', 'energy'],
		density: [0.42, 0.66],
		speed: [0.6, 0.95],
		cameras: ['slow-zoom', 'orbit', 'slow-drift'],
		glow: [0.7, 1],
		flicker: [0.3, 0.6],
		shake: [0.08, 0.22],
		vignette: [0.5, 0.7],
	},
	{
		// Acoustic and orchestral: hills, a lake, the day going.
		name: 'haze',
		match: /ambient|classical|jazz|acoustic|soundtrack|new age|singer|orchestral/i,
		mood: ['still', 'warm', 'distant'],
		concepts: ['memory', 'evening', 'water'],
		palette: {
			background: '#060a0c',
			primary: '#6f8f7a',
			secondary: '#9db7c4',
			accent: '#e6c98c',
		},
		environment: 'nature',
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
		// Blues, hard rock and everything left calling itself rock: the road.
		name: 'highway',
		match: /blues|hard rock|southern|country|soul|garage|rockabilly|rock/i,
		mood: ['worn', 'warm', 'loose'],
		concepts: ['road', 'dust', 'dusk'],
		palette: {
			background: '#0b0705',
			primary: '#d1782c',
			secondary: '#8a6a4f',
			accent: '#f2c078',
		},
		environment: 'desert',
		fog: [0.34, 0.6],
		darkness: [0.34, 0.55],
		particles: ['dust', 'embers'],
		density: [0.3, 0.52],
		speed: [0.35, 0.6],
		cameras: ['slow-drift', 'slow-zoom'],
		glow: [0.5, 0.75],
		flicker: [0.25, 0.5],
		shake: [0.1, 0.25],
		vignette: [0.56, 0.76],
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
	// recognises. The record moves off its band by less, so it reads as
	// another night in the same city rather than another city. Twelve degrees
	// was too few to see: four records of one band came out the same red.
	const bandDegrees = (band() - 0.5) * 30;
	const recordDegrees = bandDegrees + (record() - 0.5) * 26;
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
