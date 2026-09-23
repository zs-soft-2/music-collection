import { clamp, hash } from '../controller/math';
import { EnvironmentType, SongVisualProfile } from '../model';

/**
 * The shape of a world, as opposed to its colour and its weather. This is what
 * a profile's `environment.type` finally means: a set of weights the scene
 * shader reads, one per motif it can draw.
 *
 * Two worlds differing only in palette read as the same place repainted, which
 * is exactly what they looked like. So the weights decide what is *there*: a
 * city has blocks, stacks and wired poles, a forest has points, a moon and
 * curtains of light, and a planet has no ground at all.
 */
export interface WorldShape {
	/** Where the ground line sits in the frame. */
	horizon: number;
	/** 0 an open sky with nothing under it, 1 a world with a ground. */
	land: number;

	/** The four silhouette generators, blended by weight. */
	blocks: number;
	ridge: number;
	/** Points: conifers when packed and low, spires when sparse and tall. */
	spike: number;
	dunes: number;

	/** How closely the silhouette is packed, and how far it rises. */
	density: number;
	height: number;

	/** What stands in the world. */
	stacks: number;
	windows: number;
	/** A ruined arcade: the one silhouette with sky showing through it. */
	arcade: number;
	monolith: number;
	arcs: number;
	grid: number;

	/** What is in the sky. */
	stars: number;
	/** A moon at 1, a planet close enough to show its weather above that. */
	moon: number;
	aurora: number;
	nebula: number;
	/** The last of the day sitting on the horizon, with a sun in it. */
	dawn: number;
	storm: number;
	smog: number;

	/** What the ground is made of. */
	wet: number;
	water: number;
	sand: number;

	/** Light and weather in front of everything. */
	fires: number;
	beam: number;
	streaks: number;
	/** The poles and the sagging cable. */
	frame: number;
	branches: number;
}

/** An empty world: flat ground, black sky, nothing in it. */
const NOTHING: WorldShape = {
	horizon: -0.15,
	land: 1,
	blocks: 0,
	ridge: 0,
	spike: 0,
	dunes: 0,
	density: 1,
	height: 1,
	stacks: 0,
	windows: 0,
	arcade: 0,
	monolith: 0,
	arcs: 0,
	grid: 0,
	stars: 0,
	moon: 0,
	aurora: 0,
	nebula: 0,
	dawn: 0,
	storm: 0,
	smog: 0,
	wet: 0,
	water: 0,
	sand: 0,
	fires: 0,
	beam: 0,
	streaks: 0,
	frame: 0,
	branches: 0,
};

/** Reads as a list of what a place has, rather than a wall of zeroes. */
const place = (shape: Partial<WorldShape>): WorldShape => ({
	...NOTHING,
	...shape,
});

/**
 * The places a record can stand in. Each one is a different picture, not a
 * different grade of the same picture: what is on the horizon, what is in the
 * sky, what the ground is and what hangs in front all change together.
 */
export const WORLDS: Record<EnvironmentType, WorldShape> = {
	// A city of furnaces: close-packed blocks, stacks, wet ground, no sky.
	industrial: place({
		horizon: -0.15,
		blocks: 1,
		stacks: 1,
		windows: 1,
		smog: 1,
		wet: 1,
		beam: 1,
		fires: 1,
		frame: 1,
	}),
	// Taller and thinner, in the rain, lit by its own windows and signs.
	urban: place({
		horizon: -0.2,
		blocks: 1,
		density: 1.5,
		height: 1.6,
		windows: 1.5,
		grid: 0.4,
		smog: 0.7,
		stars: 0.12,
		wet: 1,
		fires: 0.25,
		beam: 0.5,
		streaks: 0.85,
		frame: 0.8,
	}),
	// A frozen coniferous horizon under a moon and a curtain of light.
	forest: place({
		horizon: -0.22,
		spike: 1,
		density: 1.5,
		height: 0.85,
		stars: 1,
		moon: 1,
		aurora: 0.9,
		wet: 0.2,
		branches: 0.6,
	}),
	// Dead trees standing in still water, with the air too thick to see far.
	swamp: place({
		horizon: -0.1,
		spike: 0.6,
		ridge: 0.4,
		density: 0.9,
		height: 0.7,
		stars: 0.3,
		moon: 0.5,
		storm: 0.25,
		water: 0.95,
		fires: 0.15,
		branches: 0.85,
	}),
	// A nave with its roof gone, its floor under water and rain coming in.
	cathedral: place({
		horizon: -0.12,
		blocks: 0.35,
		ridge: 0.2,
		height: 1.1,
		arcade: 1,
		windows: 0.5,
		moon: 0.4,
		storm: 0.55,
		water: 0.7,
		fires: 0.2,
		streaks: 1,
	}),
	// Spires on a mountain ridge, lit from inside, under a whole sky.
	citadel: place({
		horizon: -0.26,
		ridge: 0.65,
		spike: 0.7,
		density: 0.5,
		height: 1.6,
		windows: 0.8,
		stars: 1,
		moon: 0.7,
		aurora: 0.25,
		dawn: 0.25,
		fires: 0.15,
	}),
	// No ground at all: gas, stars, a planet and the rings around it.
	space: place({
		horizon: -0.5,
		land: 0,
		arcs: 0.7,
		stars: 1.2,
		moon: 1.8,
		nebula: 1,
		fires: 0.15,
	}),
	// Dunes with the last of the sun still on them.
	desert: place({
		horizon: -0.16,
		dunes: 1,
		density: 0.6,
		height: 1.1,
		stars: 0.3,
		dawn: 1,
		smog: 0.2,
		sand: 1,
		fires: 0.12,
		frame: 0.25,
	}),
	// A cold sea running to a low shore, with the weather on top of it.
	coast: place({
		horizon: -0.06,
		ridge: 0.6,
		density: 0.4,
		height: 0.7,
		moon: 0.45,
		storm: 0.9,
		water: 1,
		fires: 0.2,
		streaks: 0.6,
	}),
	// Inside something: a few enormous shapes close to the eye, and beams.
	warehouse: place({
		horizon: -0.32,
		blocks: 1,
		density: 0.2,
		height: 3.2,
		windows: 0.12,
		grid: 0.22,
		smog: 0.6,
		wet: 1,
		fires: 0.5,
		beam: 1.6,
		frame: 1,
	}),
	// Slabs and arcs: a world that was never anywhere.
	abstract: place({
		horizon: -0.1,
		ridge: 0.3,
		density: 0.6,
		height: 0.5,
		monolith: 1,
		arcs: 0.8,
		stars: 0.45,
		nebula: 0.45,
		wet: 0.3,
		fires: 0.4,
	}),
	// Hills with a treeline on them, a lake below and the day going.
	nature: place({
		horizon: -0.18,
		ridge: 1,
		spike: 0.45,
		density: 0.5,
		height: 1.2,
		stars: 0.6,
		moon: 0.6,
		dawn: 0.45,
		water: 0.35,
		fires: 0.15,
		branches: 0.3,
	}),
	// The fallback, which has a little of everything and belongs nowhere.
	custom: place({
		horizon: -0.15,
		blocks: 0.7,
		ridge: 0.3,
		stacks: 0.5,
		windows: 0.7,
		stars: 0.2,
		smog: 0.6,
		wet: 0.7,
		fires: 0.7,
		beam: 0.5,
		frame: 0.6,
	}),
};

/**
 * One motif a record may be given even though its world does not normally have
 * it. This is what keeps two records of one band from being the same frame: a
 * band's second record is the same place, but that one has a searchlight, or
 * rain, or a moon the first one did not.
 */
const SPICE: (keyof WorldShape)[] = [
	'moon',
	'aurora',
	'monolith',
	'streaks',
	'grid',
	'beam',
	'storm',
	'stars',
	'branches',
	'dawn',
];

/**
 * What a world with no ground may be given instead. Rain, a searchlight and a
 * branch overhead all need somewhere to stand, and a planet has nowhere.
 */
const SPICE_IN_ORBIT: (keyof WorldShape)[] = [
	'moon',
	'aurora',
	'arcs',
	'stars',
	'nebula',
	'monolith',
];

/** How much of that motif the record gets, when it is picked. */
const SPICE_WEIGHT = 0.42;

/** The motifs a record may lose, when it already has plenty. */
const MUTABLE: (keyof WorldShape)[] = [
	'moon',
	'aurora',
	'arcs',
	'monolith',
	'streaks',
	'grid',
	'beam',
	'storm',
	'smog',
	'branches',
	'dawn',
	'stacks',
];

/**
 * The world a record stands in: its family's place, moved off it by the
 * record's own seed. The framing shifts, the silhouette leans, the weather
 * motifs come up and down, and one motif the place does not normally have is
 * added — so two records of one band are the same city on two evenings, and
 * two bands of one family do not get the same frame either.
 */
export function worldShapeFor(
	type: EnvironmentType,
	seed: number
): Readonly<WorldShape> {
	const base = WORLDS[type];
	const draw = (offset: number) => hash(seed * 0.37 + offset);
	const jitter = (offset: number) => draw(offset) - 0.5;

	const shape: WorldShape = {
		...base,
		// Where the eye is: a high horizon is a world one is standing in, a low
		// one is a world one is looking out over.
		horizon: base.horizon + jitter(1.3) * 0.09,
		density: base.density * (1 + jitter(4.1) * 0.5),
		height: base.height * (1 + jitter(5.9) * 0.45),
		// The silhouette leans towards one of its neighbours, so a forest can
		// have a ridge behind it and a city can have a hill at its edge.
		blocks: clamp(base.blocks + jitter(7.3) * 0.3, 0, 1.5),
		ridge: clamp(base.ridge + jitter(8.9) * 0.35, 0, 1.5),
		spike: clamp(base.spike + jitter(10.1) * 0.35, 0, 1.5),
		dunes: clamp(base.dunes + jitter(11.7) * 0.25, 0, 1.5),
	};

	// Whatever weather the place has, it has more or less of it tonight.
	for (const [index, motif] of MUTABLE.entries()) {
		const value = shape[motif];
		if (value > 0.01) {
			shape[motif] = clamp(
				value * (0.55 + draw(20 + index * 2.3) * 0.85),
				0,
				2
			);
		}
	}

	// And one thing it does not usually have at all.
	const choices = shape.land > 0.5 ? SPICE : SPICE_IN_ORBIT;
	const spice = choices[Math.floor(draw(61.3) * choices.length) % choices.length];
	shape[spice] = clamp(
		shape[spice] + SPICE_WEIGHT * (0.6 + draw(63.7) * 0.8),
		0,
		2
	);

	return shape;
}

/** A stable number per key, so one record's world is always the same world. */
export function seedFrom(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (hash * 31 + id.charCodeAt(i)) % 100000;
	}
	return hash / 1000;
}

/**
 * Which world gets built. It is the record's, not the track's: a new skyline at
 * every track would say the listener had gone somewhere else, when they have
 * only turned the record over.
 */
export function worldSeed(profile: SongVisualProfile): number {
	return seedFrom(profile.world ?? profile.id);
}

/** The world a profile stands in, without going through the engine. */
export function worldShapeOf(
	profile: SongVisualProfile
): Readonly<WorldShape> {
	return worldShapeFor(profile.environment.type, worldSeed(profile));
}
