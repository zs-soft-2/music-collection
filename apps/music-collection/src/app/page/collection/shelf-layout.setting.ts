import { SHELF_CUBBY_SIZE, ShelfUnitLayout } from '@music-collection/api';

import { UserSetting } from '../../data/user-settings';

/**
 * The drawn unit itself is shared with the rest of the app (the admin form
 * files a copy into the same furniture), so it is kept with the collection
 * item; what a unit may be, and how it is stored, stays here.
 */
export type { ShelfUnitLayout };
export { SHELF_CUBBY_SIZE };

/** The furniture in the room, in the order records are filed into it. */
export interface ShelfLayoutSettings {
	units: ShelfUnitLayout[];
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
} as const;

/** What a new unit looks like before it is redrawn: a square Kallax. */
export const DEFAULT_SHELF = { rows: 4, columns: 4 } as const;

/** A room with no drawn furniture: the shelf falls back to one open wall. */
export const NO_SHELF_LAYOUT: ShelfLayoutSettings = { units: [] };

/** A side of the grid, kept inside what a drawn shelf may be. */
export function clampShelfSide(value: number): number {
	const rounded = Math.round(value);

	return Number.isFinite(rounded)
		? Math.min(
				SHELF_LIMITS.maxSide,
				Math.max(SHELF_LIMITS.minSide, rounded)
			)
		: SHELF_LIMITS.minSide;
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
	};
}

/** How many records a unit of this size holds, at `perCompartment` each. */
export function shelfCapacity(
	units: readonly ShelfUnitLayout[],
	perCompartment: number
): { compartments: number; records: number } {
	const compartments = units.reduce(
		(sum, unit) => sum + unit.rows * unit.columns,
		0
	);

	return { compartments, records: compartments * perCompartment };
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
	}),
	toDocument: ({ units }) => ({
		units: units.map(({ id, name, rows, columns }) => ({
			id,
			name,
			rows,
			columns,
		})),
	}),
};
