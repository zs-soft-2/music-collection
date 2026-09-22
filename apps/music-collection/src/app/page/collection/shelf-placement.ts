import { CollectionItemPlacement } from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import { ShelfSpotRef } from './collection.model';
import { SHELF_CUBBY_SIZE, ShelfUnitLayout } from './shelf-layout.setting';

/**
 * Filing a copy by hand: which drawn unit, which compartment of it, and how
 * far along that compartment. The placement itself lives on the collection
 * item; what is here is everything that reads it back against the furniture
 * the collector has actually drawn — a unit can be renamed, resized or thrown
 * out long after a record was filed into it.
 */

/** The furthest along a compartment a record can be filed. */
export const MAX_SHELF_POSITION = SHELF_CUBBY_SIZE;

/** One compartment of a drawn unit, as the placement picker offers it. */
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

/** The same compartment, the same distance along it. */
export function samePlace(
	a: CollectionItemPlacement | null | undefined,
	b: CollectionItemPlacement | null | undefined
): boolean {
	return a && b
		? a.unitId === b.unitId &&
				a.row === b.row &&
				a.column === b.column &&
				a.position === b.position
		: !a && !b;
}

/**
 * The places a drop gives a compartment. Every record the compartment shows
 * is filed, not only the dropped one: the collector arranged what they saw,
 * and a place given to one record alone would leave the shelf free to
 * reshuffle its neighbours around it.
 *
 * Only what actually moves comes back, so re-dropping a record where it
 * already stands writes nothing.
 */
export function placementsForDrop(
	shown: readonly ReleaseView[],
	moved: ReleaseView,
	spot: ShelfSpotRef,
	index: number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const rest = shown.filter((release) => release.id !== moved.id);
	const at = Math.max(0, Math.min(index, rest.length));
	const order = [...rest.slice(0, at), moved, ...rest.slice(at)].slice(
		0,
		MAX_SHELF_POSITION
	);

	return order
		.map((release, position) => ({
			releaseId: release.id,
			placement: { ...spot, position: position + 1 },
			was: release.placement,
		}))
		.filter(({ placement, was }) => !samePlace(was, placement))
		.map(({ releaseId, placement }) => ({ releaseId, placement }));
}
