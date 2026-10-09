import {
	DEFAULT_CUBBY,
	SHELF_HEIGHT_UNIT_CM,
	SHELF_MEDIA,
	SHELF_MEDIA_SIZES,
	SHELF_PX_PER_MM,
	ShelfCubby,
	ShelfMedia,
	ShelfStance,
	ShelfUnitLayout,
	ShelfWidths,
	cubbyHolds,
	shelfMediaSize,
} from '@music-collection/api';

import { UserSetting } from '../../data/user-settings';

/**
 * The drawn unit itself is shared with the rest of the app (the admin form
 * files a copy into the same furniture), so it is kept with the collection
 * item; what a unit may be, and how it is stored, stays here.
 */
export type {
	ShelfCubby,
	ShelfMedia,
	ShelfStance,
	ShelfUnitLayout,
	ShelfWidths,
};
export {
	DEFAULT_CUBBY,
	SHELF_HEIGHT_UNIT_CM,
	SHELF_MEDIA,
	SHELF_MEDIA_SIZES,
	SHELF_PX_PER_MM,
	cubbyHolds,
};

/**
 * The furniture in the room, in the order records are filed into it, and how
 * wide the things standing in it are.
 *
 * The widths are kept with the furniture and not with the catalog on
 * purpose: they are a measurement of *this* collector's copies — their
 * cases, their pressings — and the same album is a different width on
 * someone else's shelf.
 */
export interface ShelfLayoutSettings {
	units: ShelfUnitLayout[];
	/** Spine widths in millimetres; what is unset is the standard size. */
	widths: ShelfWidths;
}

/**
 * What a drawn unit may be. A document written by an older version — or by
 * hand — is read back through these, so nothing can ask the page for a
 * shelf with a thousand compartments.
 */
export const SHELF_LIMITS = {
	minSide: 1,
	maxSide: 12,
	maxUnits: 12,
	maxNameLength: 40,
	/** Compartment height, in `SHELF_HEIGHT_UNIT_CM` units: 4 cm to 48 cm. */
	minHeight: 1,
	maxHeight: 12,
	/** Compartment length in millimetres: 5 cm to 4 m. */
	minLength: 50,
	maxLength: 4000,
	/** The length steps by a centimetre, which is how a shelf is measured. */
	lengthStep: 10,
	/**
	 * A spine width in millimetres: 5 mm to 12 cm. The floor is the tightest
	 * a spine is ever drawn — anything narrower and a compartment's contents
	 * could be filed past the end of it — and the ceiling is a box no record
	 * shop has ever stocked.
	 */
	minWidth: 5,
	maxWidth: 120,
} as const;

/** What a new unit looks like before it is redrawn: a square Kallax. */
export const DEFAULT_SHELF = {
	rows: 4,
	columns: 4,
	cubby: DEFAULT_CUBBY,
} as const;

/** A room with no drawn furniture: the shelf falls back to one open wall. */
export const NO_SHELF_LAYOUT: ShelfLayoutSettings = { units: [], widths: {} };

/**
 * The widths the collector may set, in the order they are offered: the four
 * media first, then the two boxes — which are the sizes a collector thinks
 * of last, and reaches for only when they own one.
 */
export const SHELF_WIDTH_KINDS: ShelfMedia[] = [
	'vinyl',
	'cd',
	'dvd',
	'cassette',
	'boxset',
	'cdbox',
];

/** A spine width as the collector typed it: whole pixels on the shelf. */
export function clampSpineWidth(mm: number): number {
	const px = Math.round(mm * SHELF_PX_PER_MM);
	const snapped = Number.isFinite(px) ? px / SHELF_PX_PER_MM : 0;

	return Math.min(
		SHELF_LIMITS.maxWidth,
		Math.max(SHELF_LIMITS.minWidth, snapped || SHELF_LIMITS.minWidth)
	);
}

/**
 * The widths as the document has it. A width that is not a width is simply
 * not set, and the medium keeps its standard size: a bad number must not be
 * able to make a collection unfilable.
 */
function toWidths(value: unknown): ShelfWidths {
	const data =
		typeof value === 'object' && value !== null
			? (value as Record<string, unknown>)
			: {};

	return SHELF_WIDTH_KINDS.reduce<ShelfWidths>((widths, media) => {
		const mm = Number(data[media]);

		if (Number.isFinite(mm) && mm > 0) {
			widths[media] = clampSpineWidth(mm);
		}
		return widths;
	}, {});
}

function clamp(value: number, min: number, max: number, fallback: number) {
	const rounded = Math.round(value);

	return Number.isFinite(rounded)
		? Math.min(max, Math.max(min, rounded))
		: fallback;
}

/** A side of the grid, kept inside what a drawn shelf may be. */
export function clampShelfSide(value: number): number {
	return clamp(
		value,
		SHELF_LIMITS.minSide,
		SHELF_LIMITS.maxSide,
		SHELF_LIMITS.minSide
	);
}

/** A compartment height, kept inside what a drawn shelf may be. */
export function clampCubbyHeight(value: number): number {
	return clamp(
		value,
		SHELF_LIMITS.minHeight,
		SHELF_LIMITS.maxHeight,
		DEFAULT_CUBBY.height
	);
}

/** A compartment length in millimetres, snapped to the centimetre. */
export function clampCubbyLength(value: number): number {
	const step = SHELF_LIMITS.lengthStep;

	return (
		clamp(
			value / step,
			SHELF_LIMITS.minLength / step,
			SHELF_LIMITS.maxLength / step,
			DEFAULT_CUBBY.length / step
		) * step
	);
}

/** A side of the grid, or null where the stored value is not one. */
function side(value: unknown): number | null {
	const rounded = Math.round(Number(value));

	return Number.isFinite(rounded) &&
		rounded >= SHELF_LIMITS.minSide &&
		rounded <= SHELF_LIMITS.maxSide
		? rounded
		: null;
}

/**
 * The compartment as the document has it. A unit drawn before compartments
 * had a size at all gets the Kallax cubby the app used to assume for every
 * shelf, so nothing the collector already drew changes shape under them.
 */
function toCubby(value: unknown): ShelfCubby {
	const data =
		typeof value === 'object' && value !== null
			? (value as Record<string, unknown>)
			: {};

	return {
		height: clampCubbyHeight(Number(data['height'])),
		length: clampCubbyLength(Number(data['length'])),
		stance: data['stance'] === 'down' ? 'down' : 'across',
	};
}

function toUnit(value: unknown, index: number): ShelfUnitLayout | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}

	const data = value as Record<string, unknown>;
	const rows = side(data['rows']);
	const columns = side(data['columns']);

	if (rows === null || columns === null) {
		return null;
	}

	const id = data['id'];
	const name = data['name'];

	return {
		id: typeof id === 'string' && id ? id : `shelf-${index + 1}`,
		name:
			typeof name === 'string'
				? name.slice(0, SHELF_LIMITS.maxNameLength)
				: '',
		rows,
		columns,
		cubby: toCubby(data['cubby']),
	};
}

/** How many copies of each medium the collector owns. */
export type ShelfMediaMix = Partial<Record<string, number>>;

/** What the drawn furniture holds, against what it has to hold. */
export interface ShelfRoom {
	compartments: number;
	/** Every compartment's length added up, in millimetres. */
	length: number;
	/** Copies the furniture has room for, out of the ones there are. */
	holds: number;
	/** Copies with nowhere to stand. */
	short: number;
	/**
	 * How many copies land in each compartment, in the order the units stand
	 * in the room. It is what lets the little drawing in the settings fill up
	 * as the collection does.
	 */
	filled: number[];
}

/**
 * Fits the collection into the drawn furniture on paper. The media are
 * offered tallest first, and each one takes the *shortest* compartment that
 * can still hold it — so a CD rack is not spent on records that a record
 * shelf would have taken anyway. With heights this simply ordered that is
 * not a heuristic but the best the furniture can do.
 */
export function shelfCapacity(
	units: readonly ShelfUnitLayout[],
	mix: ShelfMediaMix,
	widths: ShelfWidths = {}
): ShelfRoom {
	const compartments = units.flatMap((unit) =>
		Array.from({ length: unit.rows * unit.columns }, () => unit.cubby)
	);
	const filled = compartments.map(() => 0);
	/* Shortest first, so the fussiest compartment is offered every medium. */
	const room = compartments
		.map((cubby, at) => ({ at, height: cubby.height, left: cubby.length }))
		.sort((a, b) => a.height - b.height);
	const wanted = Object.entries(mix).filter(([, count]) => (count ?? 0) > 0);
	/* Tallest first, because only a tall compartment will ever take them. */
	const byHeight = wanted.sort(
		(a, b) => shelfMediaSize(b[0]).height - shelfMediaSize(a[0]).height
	);
	let holds = 0;
	let short = 0;

	for (const [media, count] of byHeight) {
		const { height, thickness } = shelfMediaSize(media, widths);
		let left = count ?? 0;

		for (const shelf of room) {
			if (!left) {
				break;
			}
			if (shelf.height < height) {
				continue;
			}
			const fits = Math.min(left, Math.floor(shelf.left / thickness));

			shelf.left -= fits * thickness;
			filled[shelf.at] += fits;
			left -= fits;
			holds += fits;
		}
		short += left;
	}

	return {
		compartments: compartments.length,
		length: compartments.reduce((sum, cubby) => sum + cubby.length, 0),
		holds,
		short,
		filled,
	};
}

export const SHELF_LAYOUT_SETTING: UserSetting<ShelfLayoutSettings> = {
	id: 'shelf-layout',
	featureKey: 'shelf-layout-setting',
	storageKey: 'mc.collection.shelves',
	toValue: (data) => ({
		units: (Array.isArray(data['units']) ? data['units'] : [])
			.map(toUnit)
			.filter((unit): unit is ShelfUnitLayout => unit !== null)
			.slice(0, SHELF_LIMITS.maxUnits),
		widths: toWidths(data['widths']),
	}),
	toDocument: ({ units, widths }) => ({
		units: units.map(({ id, name, rows, columns, cubby }) => ({
			id,
			name,
			rows,
			columns,
			cubby: { ...cubby },
		})),
		widths: { ...widths },
	}),
};
