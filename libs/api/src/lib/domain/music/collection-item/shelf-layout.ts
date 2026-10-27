import { CollectionItemPlacement, ShelfSide } from './collection-item';

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
 * sleeve is six of them and a compartment counted in whole centimetres would
 * lose a record every time.
 */
export const SHELF_HEIGHT_UNIT_CM = 4;

/**
 * How much of a pixel a millimetre of shelf is drawn at. The shelf page
 * measures in millimetres and draws in pixels, and this is the one place
 * the two meet — which is why it lives here beside the sizes rather than in
 * the component: the collector sets a spine width in pixels, by eye, and
 * what is stored is the shelf it stands for.
 *
 * A little under a pixel to the millimetre, which puts a Kallax cubby at the
 * 260-odd pixels a column has always been.
 */
export const SHELF_PX_PER_MM = 0.8;

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
export type ShelfMedia =
	'vinyl' | 'cd' | 'cassette' | 'dvd' | 'boxset' | 'cdbox';

/**
 * Real sleeves and cases, rounded to what a shelf cares about. The heights
 * are the four the collector picks a compartment by; the thicknesses are the
 * spines themselves — an LP sleeve is the thinnest thing on the shelf and a
 * cassette case the chunkiest, which is why a cassette rack holds fewer
 * copies per metre than a record shelf does.
 *
 * The thickness is the *plainest* copy of that medium: one record in one
 * single sleeve, one disc in one jewel case. It is a floor, not an average
 * — what the packaging adds on top of it is `SHELF_SLEEVE_EXTRA`. Six
 * millimetres for a record is what a tape measure says: a hundred LPs make
 * a run of shelf about sixty centimetres long, so a Kallax cubby takes
 * fifty-odd of them and not the seventy the cardboard alone would suggest.
 */
export const SHELF_MEDIA_SIZES: Record<ShelfMedia, ShelfMediaSize> = {
	vinyl: { height: 8, thickness: 6 },
	boxset: { height: 8, thickness: 30 },
	dvd: { height: 5, thickness: 14 },
	cd: { height: 3, thickness: 10 },
	cdbox: { height: 3, thickness: 24 },
	cassette: { height: 2, thickness: 17 },
};

/**
 * The spine widths a collector may set for themselves, in millimetres,
 * against the medium each one measures. What is not set is measured by
 * `SHELF_MEDIA_SIZES`.
 *
 * It is a measurement and not a drawing preference: the same number says how
 * wide the spine is drawn *and* how many copies a compartment holds, because
 * on a real shelf those are the same question. A collector whose CDs are in
 * slim cases says so once, and the shelf both draws them slim and fits more
 * of them in a cubby.
 */
export type ShelfWidths = Partial<Record<ShelfMedia, number>>;

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
	'cdbox',
	'cassette',
];

/**
 * The tightest a spine can be squeezed, which is what a compartment can be
 * made to hold most of. Deliberately thinner than the plainest sleeve the
 * shelf measures by: a collector who packs a cubby until the cardboard
 * creaks gets more in than a tape measure allows for, and `maxPositionIn`
 * is there to catch nonsense, not to tell them they are wrong.
 *
 * It is also why this is a number of its own rather than the thinnest
 * `SHELF_MEDIA_SIZES` entry. Re-measuring a medium must not narrow the
 * bound: a shelf someone has already arranged by hand would lose whatever
 * stands past the new limit.
 */
const TIGHTEST_SPINE = 5;

/**
 * What one copy of this medium takes up, whatever word it arrived as — at
 * the width the collector set for it, where they set one.
 *
 * Only the thickness is theirs to set. The height is what the medium is: a
 * CD case is twelve centimetres tall whatever the collector thinks of it,
 * and it is the height that decides which compartments a copy may go in.
 */
export function shelfMediaSize(
	media: unknown,
	widths?: ShelfWidths
): ShelfMediaSize {
	const known = typeof media === 'string' && media in SHELF_MEDIA_SIZES;
	const size = known
		? SHELF_MEDIA_SIZES[media as ShelfMedia]
		: UNKNOWN_MEDIA_SIZE;
	const set = known ? widths?.[media as ShelfMedia] : undefined;

	return set && set > 0 ? { ...size, thickness: set } : size;
}

/**
 * What is known about one copy, beyond its medium, that makes it wider than
 * the plain thing. Nothing here is about the music: it is all cardboard.
 */
export interface ShelfSleeve {
	/** Packed as a box set: a slab, whatever medium is inside it. */
	boxSet?: boolean;
	/**
	 * A jacket that folds open. Two boards instead of one, and more often
	 * than not a second record between them — which is why it is the biggest
	 * step on a record shelf short of a box.
	 */
	gatefold?: boolean;
	/** A deluxe edition: the booklet, the poster and the insert go with it. */
	deluxe?: boolean;
	/** Heavy vinyl (180 g): a thicker record, usually a sturdier jacket. */
	heavy?: boolean;
}

/**
 * What each of those adds to a spine, in millimetres. They add up, because
 * on a shelf they do: a 180 g record in a gatefold jacket really is the
 * width of both.
 */
export const SHELF_SLEEVE_EXTRA: Record<
	Exclude<keyof ShelfSleeve, 'boxSet'>,
	number
> = {
	gatefold: 4,
	deluxe: 3,
	heavy: 1,
};

/**
 * How much shelf one copy eats — the medium, plus whatever its packaging
 * adds. A box set is not widened but replaced: it is measured as the slab it
 * is however its medium is recorded, because that is the one case where the
 * packaging *is* the thing on the shelf.
 *
 * Which slab depends on what is in it. A box of CDs is a CD's height however
 * many discs it holds, so a CD rack takes it and a record shelf is not spent
 * on it; everything else is boxed at an LP's height, which is what a box set
 * is when nothing says otherwise.
 *
 * A copy nobody has tagged comes out at the plain width, which is the honest
 * answer: the shelf draws what is known about a record, not a guess at what
 * the jacket might be.
 */
export function shelfCopySize(
	media: unknown,
	sleeve: ShelfSleeve = {},
	widths?: ShelfWidths
): ShelfMediaSize {
	if (sleeve.boxSet) {
		return shelfMediaSize(media === 'cd' ? 'cdbox' : 'boxset', widths);
	}

	const size = shelfMediaSize(media, widths);
	const extra = (
		Object.keys(SHELF_SLEEVE_EXTRA) as (keyof typeof SHELF_SLEEVE_EXTRA)[]
	).reduce(
		(sum, trait) => sum + (sleeve[trait] ? SHELF_SLEEVE_EXTRA[trait] : 0),
		0
	);

	return extra ? { ...size, thickness: size.thickness + extra } : size;
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

/** One compartment of a drawn unit, named by where it stands in it. */
export interface ShelfHost {
	unitId: string;
	row: number;
	column: number;
}

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
	/**
	 * The compartment of another unit this one stands in: an insert, such as
	 * a CD tower put into a Kallax cubby. Missing on furniture that stands in
	 * the room.
	 *
	 * An insert is a unit like any other — a copy is filed into it by its id,
	 * which is why a placement needs no new word for it — and only the
	 * compartment it stands in changes: that one holds the inserts and no
	 * records of its own. Inserts go one deep, and they stand side by side
	 * in the order the units are listed.
	 */
	inside?: ShelfHost;
}

/**
 * What a unit is called where it is named on its own — a radio station, a
 * copy's place. An insert is named after the unit it stands in as well,
 * because "CD tower" says nothing until it is said which shelf it is in.
 */
export function unitTitle(
	unit: ShelfUnitLayout,
	units: readonly ShelfUnitLayout[],
	unnamed: string
): string {
	const own = unit.name || unnamed;
	const host = unit.inside
		? units.find((drawn) => drawn.id === unit.inside?.unitId)
		: undefined;

	return host ? `${host.name || unnamed} › ${own}` : own;
}

/** The unit stands in another one's compartment rather than in the room. */
export function isInsert(unit: ShelfUnitLayout): boolean {
	return !!unit.inside;
}

/** The inserts standing in one compartment, left to right. */
export function insertsIn(
	units: readonly ShelfUnitLayout[],
	host: ShelfHost
): ShelfUnitLayout[] {
	return units.filter(
		(unit) =>
			!!unit.inside &&
			unit.inside.unitId === host.unitId &&
			unit.inside.row === host.row &&
			unit.inside.column === host.column
	);
}

/**
 * The inserts the drawn furniture can actually hold. An insert stands in a
 * compartment of a unit that stands in the room — never in another insert,
 * never in a tower, whose copies lie flat and leave no floor to stand
 * anything on — and in a compartment that unit still has. Whatever the
 * furniture no longer answers to is dropped: its copies go back to being
 * filed by the shelf, the way a copy in a compartment that was drawn away
 * does.
 */
export function withHeldInserts(
	units: readonly ShelfUnitLayout[]
): ShelfUnitLayout[] {
	return units.filter((unit) => {
		if (!unit.inside) {
			return true;
		}
		const { unitId, row, column } = unit.inside;
		const host = units.find((drawn) => drawn.id === unitId);

		return (
			!!host &&
			!host.inside &&
			host.cubby.stance === 'across' &&
			row >= 1 &&
			row <= host.rows &&
			column >= 1 &&
			column <= host.columns
		);
	});
}

/**
 * Every compartment records are filed into, in the order they are filled:
 * unit by unit as they stand in the room, top left to bottom right, and a
 * compartment holding inserts read as the inserts' compartments in its
 * place. A collector walking along the furniture passes them in this order.
 */
export function shelfWalk(
	units: readonly ShelfUnitLayout[]
): { unit: ShelfUnitLayout; row: number; column: number }[] {
	const walk: { unit: ShelfUnitLayout; row: number; column: number }[] = [];
	const visit = (unit: ShelfUnitLayout) => {
		for (let row = 1; row <= unit.rows; row++) {
			for (let column = 1; column <= unit.columns; column++) {
				const inserts = insertsIn(units, {
					unitId: unit.id,
					row,
					column,
				});

				if (inserts.length) {
					inserts.forEach(visit);
				} else {
					walk.push({ unit, row, column });
				}
			}
		}
	};

	units.filter((unit) => !unit.inside).forEach(visit);

	return walk;
}

/**
 * How much of a compartment's face a unit takes, in millimetres: how wide it
 * stands and how tall. A shelf's compartments run their length across and
 * their height up; a tower's the other way round.
 */
export function unitFootprint(unit: ShelfUnitLayout): {
	width: number;
	height: number;
} {
	const along = unit.cubby.length;
	const across = unit.cubby.height * SHELF_HEIGHT_UNIT_CM * 10;
	const cell =
		unit.cubby.stance === 'down'
			? { width: across, height: along }
			: { width: along, height: across };

	return {
		width: cell.width * unit.columns,
		height: cell.height * unit.rows,
	};
}

/**
 * The inserts of one compartment do not fit in it: side by side they are
 * wider than it is long, or one of them is taller than it is high. Said, not
 * prevented — the collector may well be drawing an insert before resizing
 * the compartment to it — and never squeezed to fit.
 */
export function insertsOverflow(
	host: ShelfUnitLayout,
	inserts: readonly ShelfUnitLayout[]
): boolean {
	const prints = inserts.map(unitFootprint);
	const width = prints.reduce((sum, print) => sum + print.width, 0);
	const height = Math.max(0, ...prints.map((print) => print.height));

	return (
		width > host.cubby.length ||
		height > host.cubby.height * SHELF_HEIGHT_UNIT_CM * 10
	);
}

/** A compartment this tall has room for a copy of this medium standing up. */
export function cubbyTakes(cubby: ShelfCubby, media: unknown): boolean {
	return shelfMediaSize(media).height <= cubby.height;
}

/** How many copies of one medium alone a compartment this size holds. */
export function cubbyHolds(
	cubby: ShelfCubby,
	media: unknown,
	widths?: ShelfWidths
): number {
	const size = shelfMediaSize(media, widths);

	return size.height <= cubby.height
		? Math.floor(cubby.length / size.thickness)
		: 0;
}

/**
 * The furthest along a compartment a copy can be filed: what it would hold
 * packed as tight as a compartment can be packed. A copy filed by hand is
 * the collector's business — they may leave a compartment half empty or
 * squeeze it — so this is a bound against nonsense rather than a capacity,
 * and it is measured by `TIGHTEST_SPINE` rather than by any real sleeve.
 */
export function maxPositionIn(unit: ShelfUnitLayout): number {
	return Math.max(1, Math.floor(unit.cubby.length / TIGHTEST_SPINE));
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

/** The compartment a placement names, as a key. Both walls of a compartment
 * are the same compartment, so the side is deliberately left out of it. */
export function placementKey(placement: CollectionItemPlacement): string {
	return spotKey(placement.unitId, placement.row, placement.column);
}

/**
 * The wall a placement stands against. A placement with nothing to say about
 * it stands at the left, which is both where a compartment fills from and
 * where every copy filed before the right wall existed already stands.
 */
export function placementSide(
	placement: CollectionItemPlacement | null | undefined
): ShelfSide {
	return placement?.side === 'right' ? 'right' : 'left';
}

/**
 * A placement as it is stored: the left wall is written as the absence of a
 * side rather than as a word.
 *
 * It keeps the documents of a collection that never used the right wall byte
 * for byte what they were, which is what lets "keep the shelf as it stands"
 * stay a no-op on a shelf already frozen — a few hundred writes saved every
 * time somebody presses it twice.
 */
export function placementAt(
	spot: { unitId: string; row: number; column: number },
	side: ShelfSide,
	position: number
): CollectionItemPlacement {
	const { unitId, row, column } = spot;

	return side === 'right'
		? { unitId, row, column, side, position }
		: { unitId, row, column, position };
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

	const held = withHeldInserts(units);
	const unit = held.find((drawn) => drawn.id === placement.unitId);
	const row = whole(placement.row);
	const column = whole(placement.column);
	const position = whole(placement.position);

	return unit &&
		row !== null &&
		column !== null &&
		position !== null &&
		row <= unit.rows &&
		column <= unit.columns &&
		position <= maxPositionIn(unit) &&
		/* A compartment holding inserts holds nothing else. */
		!insertsIn(held, { unitId: unit.id, row, column }).length
		? placementAt(
				{ unitId: unit.id, row, column },
				placementSide(placement),
				position
			)
		: null;
}

/**
 * The position that puts a copy at the inner end of one of a compartment's
 * two runs, given what is already filed against that wall. Kept inside what
 * the compartment could hold, so a crowded one stacks at its last position
 * rather than growing without end.
 */
export function nextPosition(
	filed: readonly CollectionItemPlacement[],
	unit: ShelfUnitLayout,
	row: number,
	column: number,
	side: ShelfSide = 'left'
): number {
	const key = spotKey(unit.id, row, column);
	const taken = filed
		.filter(
			(placement) =>
				placementKey(placement) === key &&
				placementSide(placement) === side
		)
		.map((placement) => placement.position);

	return Math.min(maxPositionIn(unit), Math.max(0, ...taken) + 1);
}

/**
 * Every compartment of a unit a copy can be filed into, top left to bottom
 * right. Given the rest of the furniture, the ones holding inserts are left
 * out: the copy goes into the insert, which is a unit of its own.
 */
export function unitSpots(
	unit: ShelfUnitLayout,
	units: readonly ShelfUnitLayout[] = []
): ShelfSpot[] {
	const spots: ShelfSpot[] = [];
	const held = withHeldInserts(units);

	for (let row = 1; row <= unit.rows; row++) {
		for (let column = 1; column <= unit.columns; column++) {
			if (insertsIn(held, { unitId: unit.id, row, column }).length) {
				continue;
			}
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
