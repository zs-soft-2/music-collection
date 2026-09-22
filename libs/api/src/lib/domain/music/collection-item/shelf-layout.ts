import { CollectionItemPlacement } from './collection-item';

/**
 * The furniture a collector drew for their records, and reading a placement
 * back against it. The drawing itself is kept with the user's settings; what
 * is here is the shape everyone agrees on — the collection page that draws
 * the shelf, and the form that files one copy by hand.
 */

/**
 * One piece of shelving furniture: a grid of square compartments. Rows and
 * columns are what makes a unit stand up or lie down — 4 × 2 is a tall one,
 * 2 × 4 the same unit on its side.
 */
export interface ShelfUnitLayout {
	id: string;
	/** What the collector calls it, e.g. "Living room". May be empty. */
	name: string;
	/** Compartments from top to bottom. */
	rows: number;
	/** Compartments from left to right. */
	columns: number;
}

/** Spines per compartment before the records continue in the next one. */
export const SHELF_CUBBY_SIZE = 36;

/** The furthest along a compartment a record can be filed. */
export const MAX_SHELF_POSITION = SHELF_CUBBY_SIZE;

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
		position <= MAX_SHELF_POSITION
		? { unitId: unit.id, row, column, position }
		: null;
}

/**
 * The position that puts a copy at the end of a compartment, given what is
 * already filed there. Kept inside what a compartment holds, so a crowded
 * one stacks at its last position rather than growing without end.
 */
export function nextPosition(
	filed: readonly CollectionItemPlacement[],
	unitId: string,
	row: number,
	column: number
): number {
	const key = spotKey(unitId, row, column);
	const taken = filed
		.filter((placement) => placementKey(placement) === key)
		.map((placement) => placement.position);

	return Math.min(MAX_SHELF_POSITION, Math.max(0, ...taken) + 1);
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
