import { CollectionItemPlacement } from './collection-item';

/**
 * The furniture a collector drew for their records, and reading a placement
 * back against it. The drawing itself is kept with the user's settings; what
 * is here is the shape everyone agrees on — the collection page that draws
 * the shelf, and the form that files one copy by hand.
 */

/**
 * A compartment is measured the way a collector measures one: with a tape.
 * Its height decides *what* goes in it, its length decides *how much*, and
 * the two are independent — a CD rack is short and long, a cassette tower
 * short and tall.
 *
 * Height is counted in units of four centimetres rather than in centimetres,
 * because nobody measures a shelf to the centimetre and the media come in a
 * handful of heights anyway: a cassette is 2 (8 cm), a CD 3 (12 cm), a DVD 5
 * (20 cm) and an LP 8 (32 cm). Length is kept in millimetres, because an LP
 * sleeve is five of them and a compartment counted in whole centimetres would
 * lose a record every time.
 */
export const SHELF_HEIGHT_UNIT_CM = 4;

/** What one copy takes up on a shelf. */
export interface ShelfMediaSize {
	/** How tall it stands, in `SHELF_HEIGHT_UNIT_CM` units. */
	height: number;
	/** How much of a compartment's length its spine eats, in millimetres. */
	thickness: number;
}

/**
 * The media a shelf knows how to hold. These are the words a copy's medium
 * comes in (`MediaEnum` in the catalog, `MediaFormat` in the UI); anything
 * else is measured by `UNKNOWN_MEDIA_SIZE`.
 */
export type ShelfMedia = 'vinyl' | 'cd' | 'cassette' | 'dvd' | 'boxset';

/**
 * Real sleeves and cases, rounded to what a shelf cares about. The heights
 * are the four the collector picks a compartment by; the thicknesses are the
 * spines themselves — an LP sleeve is the thinnest thing on the shelf and a
 * cassette case the chunkiest, which is why a cassette rack holds fewer
 * copies per metre than a record shelf does.
 */
export const SHELF_MEDIA_SIZES: Record<ShelfMedia, ShelfMediaSize> = {
	vinyl: { height: 8, thickness: 5 },
	boxset: { height: 8, thickness: 30 },
	dvd: { height: 5, thickness: 14 },
	cd: { height: 3, thickness: 10 },
	cassette: { height: 2, thickness: 17 },
};

/**
 * A copy whose medium the shelf has no word for. It is given an LP's height
 * — so it is only ever filed into a compartment tall enough for anything —
 * and a middling thickness, so a shelf full of them is neither absurdly
 * roomy nor absurdly cramped.
 */
export const UNKNOWN_MEDIA_SIZE: ShelfMediaSize = { height: 8, thickness: 10 };

/** The media a shelf holds, tallest first: how a capacity is read out. */
export const SHELF_MEDIA: ShelfMedia[] = [
	'vinyl',
	'boxset',
	'dvd',
	'cd',
	'cassette',
];

/** The thinnest spine there is, which is what a compartment holds most of. */
const THINNEST = Math.min(
	...SHELF_MEDIA.map((media) => SHELF_MEDIA_SIZES[media].thickness)
);

/** What one copy of this medium takes up, whatever word it arrived as. */
export function shelfMediaSize(media: unknown): ShelfMediaSize {
	return typeof media === 'string' && media in SHELF_MEDIA_SIZES
		? SHELF_MEDIA_SIZES[media as ShelfMedia]
		: UNKNOWN_MEDIA_SIZE;
}

/**
 * How the copies lie in a compartment. `across` is the ordinary shelf: the
 * records stand side by side, spines out, and the length runs left to right.
 * `down` is a tower — a cassette or CD column — where the copies lie flat on
 * top of one another and the length runs up the wall.
 *
 * It changes nothing about how much fits: a metre of shelf is a metre either
 * way. It is how the compartment is drawn, and how the collector thinks of
 * it.
 */
export type ShelfStance = 'across' | 'down';

/** How big one compartment of a unit is, and how its copies lie in it. */
export interface ShelfCubby {
	/** Inside height in `SHELF_HEIGHT_UNIT_CM` units; taller copies stay out. */
	height: number;
	/** Inside length in millimetres, however the compartment is turned. */
	length: number;
	stance: ShelfStance;
}

/**
 * The compartment a unit is taken to have where the drawing does not say —
 * an IKEA Kallax cubby, which is what most collectors' record shelving is:
 * 33 cm across and tall enough for an LP.
 */
export const DEFAULT_CUBBY: ShelfCubby = {
	height: 8,
	length: 330,
	stance: 'across',
};

/**
 * One piece of shelving furniture: a grid of compartments, all the same size.
 * Rows and columns are what makes a unit stand up or lie down — 4 × 2 is a
 * tall one, 2 × 4 the same unit on its side — and `cubby` is how big one of
 * its compartments is, which is what decides what may go in it.
 */
export interface ShelfUnitLayout {
	id: string;
	/** What the collector calls it, e.g. "Living room". May be empty. */
	name: string;
	/** Compartments from top to bottom. */
	rows: number;
	/** Compartments from left to right. */
	columns: number;
	/** How big one of its compartments is; all of them are alike. */
	cubby: ShelfCubby;
}

/** A compartment this tall has room for a copy of this medium standing up. */
export function cubbyTakes(cubby: ShelfCubby, media: unknown): boolean {
	return shelfMediaSize(media).height <= cubby.height;
}

/** How many copies of one medium alone a compartment this size holds. */
export function cubbyHolds(cubby: ShelfCubby, media: unknown): number {
	const size = shelfMediaSize(media);

	return size.height <= cubby.height
		? Math.floor(cubby.length / size.thickness)
		: 0;
}

/**
 * The furthest along a compartment a copy can be filed: what it would hold
 * if it were packed with nothing but the thinnest sleeves there are. A copy
 * filed by hand is the collector's business — they may leave a compartment
 * half empty or squeeze it — so this is a bound against nonsense rather than
 * a capacity.
 */
export function maxPositionIn(unit: ShelfUnitLayout): number {
	return Math.max(1, Math.floor(unit.cubby.length / THINNEST));
}

/** One compartment of a drawn unit, as a placement picker offers it. */
export interface ShelfSpot {
	unitId: string;
	row: number;
	column: number;
	/** "Row 2 · Slot 3", the compartment read out loud. */
	label: string;
}

/** Identifies a compartment across units; the arrangement files by it. */
export function spotKey(unitId: string, row: number, column: number): string {
	return `${unitId}#${row}:${column}`;
}

/** The compartment a placement names, as a key. */
export function placementKey(placement: CollectionItemPlacement): string {
	return spotKey(placement.unitId, placement.row, placement.column);
}

function whole(value: unknown): number | null {
	const rounded = Math.round(Number(value));

	return Number.isFinite(rounded) && rounded >= 1 ? rounded : null;
}

/**
 * The placement as the drawn furniture allows it, or `null` where no drawn
 * compartment answers to it any more — the unit was thrown out, or redrawn
 * smaller than the record was filed into. Such a copy goes back to being
 * filed by the shelf rather than disappearing into a compartment nobody can
 * see.
 */
export function placementInLayout(
	placement: CollectionItemPlacement | null | undefined,
	units: readonly ShelfUnitLayout[]
): CollectionItemPlacement | null {
	if (!placement) {
		return null;
	}

	const unit = units.find((drawn) => drawn.id === placement.unitId);
	const row = whole(placement.row);
	const column = whole(placement.column);
	const position = whole(placement.position);

	return unit &&
		row !== null &&
		column !== null &&
		position !== null &&
		row <= unit.rows &&
		column <= unit.columns &&
		position <= maxPositionIn(unit)
		? { unitId: unit.id, row, column, position }
		: null;
}

/**
 * The position that puts a copy at the end of a compartment, given what is
 * already filed there. Kept inside what the compartment could hold, so a
 * crowded one stacks at its last position rather than growing without end.
 */
export function nextPosition(
	filed: readonly CollectionItemPlacement[],
	unit: ShelfUnitLayout,
	row: number,
	column: number
): number {
	const key = spotKey(unit.id, row, column);
	const taken = filed
		.filter((placement) => placementKey(placement) === key)
		.map((placement) => placement.position);

	return Math.min(maxPositionIn(unit), Math.max(0, ...taken) + 1);
}

/** Every compartment of a unit, top left to bottom right. */
export function unitSpots(unit: ShelfUnitLayout): ShelfSpot[] {
	const spots: ShelfSpot[] = [];

	for (let row = 1; row <= unit.rows; row++) {
		for (let column = 1; column <= unit.columns; column++) {
			spots.push({
				unitId: unit.id,
				row,
				column,
				label: `Row ${row} · Slot ${column}`,
			});
		}
	}

	return spots;
}
