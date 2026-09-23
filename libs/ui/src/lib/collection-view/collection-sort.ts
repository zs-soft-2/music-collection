/** One column the list is sorted by, ascending (1) or descending (-1). */
export interface CollectionSortLevel {
	field: string;
	order: 1 | -1;
}

/**
 * The list in the order the columns ask for, the levels in the order they
 * were clicked. Nothing to sort by leaves the list as it came — which is
 * the last changed first, the order the collections are loaded in.
 */
export function sortItems<T>(
	items: T[],
	levels: readonly CollectionSortLevel[]
): T[] {
	if (!levels.length) {
		return items;
	}

	return [...items].sort((one, other) => {
		for (const level of levels) {
			const result = compare(
				valueOf(one, level.field),
				valueOf(other, level.field),
				level.order
			);

			if (result !== 0) {
				return result;
			}
		}

		return 0;
	});
}

/**
 * How the column is sorted: 1 ascending, -1 descending, 0 not at all.
 */
export function orderOf(
	levels: readonly CollectionSortLevel[],
	field: string
): 1 | -1 | 0 {
	return levels.find((level) => level.field === field)?.order ?? 0;
}

/**
 * The levels after the column was clicked: on its own it takes the list
 * over, or turns it around when it is already the one sorting; asked to be
 * added, it becomes a further level, so a column can break the ties of the
 * one before it.
 */
export function sortedBy(
	levels: readonly CollectionSortLevel[],
	field: string,
	add: boolean
): CollectionSortLevel[] {
	const sorted = levels.find((level) => level.field === field);
	const turned: CollectionSortLevel = {
		field,
		order: sorted?.order === 1 ? -1 : 1,
	};

	if (!add) {
		return [turned];
	}

	return sorted
		? levels.map((level) => (level.field === field ? turned : level))
		: [...levels, turned];
}

/** The value of a field, `album.artist.name` and the like included. */
function valueOf(item: unknown, field: string): unknown {
	return field
		.split('.')
		.reduce<unknown>(
			(value, key) =>
				value === null || value === undefined
					? undefined
					: (value as Record<string, unknown>)[key],
			item
		);
}

/** An empty cell comes last whichever way the column is turned. */
function compare(one: unknown, other: unknown, order: 1 | -1): number {
	const oneEmpty = one === null || one === undefined || one === '';
	const otherEmpty = other === null || other === undefined || other === '';

	if (oneEmpty || otherEmpty) {
		return oneEmpty === otherEmpty ? 0 : oneEmpty ? 1 : -1;
	}

	if (typeof one === 'number' && typeof other === 'number') {
		return (one - other) * order;
	}

	return (
		String(one).localeCompare(String(other), undefined, {
			numeric: true,
			sensitivity: 'base',
		}) * order
	);
}
