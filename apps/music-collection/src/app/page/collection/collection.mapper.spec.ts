import { CollectionItemPlacement } from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import { arrangeShelves, splitByPlacement } from './collection.mapper';
import { ReleaseGroup } from './collection.model';
import { ShelfUnitLayout } from './shelf-layout.setting';

function release(
	id: string,
	artistName = 'Judas Priest',
	placement: CollectionItemPlacement | null = null
): ReleaseView {
	return {
		id,
		albumId: `album-${id}`,
		releaseId: null,
		title: id,
		artistId: 'artist',
		artistName,
		coverUrl: null,
		format: 'vinyl',
		albumType: 'LP',
		year: 1990,
		styles: [],
		editions: [],
		weight: null,
		boxSet: false,
		pictureDisc: false,
		addedAt: 0,
		labelName: null,
		country: null,
		placement,
	};
}

function compartment(key: string): ReleaseGroup {
	return { key, label: key.toUpperCase(), items: [release(key)] };
}

function unit(id: string, rows: number, columns: number): ShelfUnitLayout {
	return { id, name: id, rows, columns };
}

/** Compartments with something in them, in grid order. */
function held(compartments: ReleaseGroup[]): string[] {
	return compartments
		.filter((group) => group.items.length)
		.map((group) => group.key);
}

describe('arrangeShelves', () => {
	it('leaves an empty collection without furniture', () => {
		expect(arrangeShelves([], [])).toEqual([]);
	});

	it('stands the records on one open wall while nothing is drawn', () => {
		const shelves = arrangeShelves([compartment('a')], []);

		expect(shelves).toHaveLength(1);
		expect(shelves[0].columns).toBe(0);
		expect(shelves[0].compartments).toHaveLength(1);
	});

	it('fills each unit before the next one is touched', () => {
		const shelves = arrangeShelves(
			['a', 'b', 'c', 'd', 'e'].map(compartment),
			[unit('one', 2, 2), unit('two', 1, 3)]
		);

		expect(shelves.map((shelf) => shelf.key)).toEqual(['one', 'two']);
		expect(held(shelves[0].compartments)).toEqual(['a', 'b', 'c', 'd']);
		expect(held(shelves[1].compartments)).toEqual(['e']);
	});

	it('keeps the compartments a unit was drawn with, filled or not', () => {
		const shelves = arrangeShelves([compartment('a')], [unit('one', 2, 3)]);

		expect(shelves[0].compartments).toHaveLength(6);
		expect(held(shelves[0].compartments)).toEqual(['a']);
	});

	it('shows what no drawn compartment was left for', () => {
		const shelves = arrangeShelves(['a', 'b', 'c'].map(compartment), [
			unit('one', 1, 2),
		]);

		expect(shelves).toHaveLength(2);
		expect(shelves[1].overflow).toBe(true);
		expect(held(shelves[1].compartments)).toEqual(['c']);
	});

	it('does not add an overflow unit when everything fits', () => {
		const shelves = arrangeShelves(['a', 'b'].map(compartment), [
			unit('one', 1, 2),
		]);

		expect(shelves).toHaveLength(1);
		expect(held(shelves[0].compartments)).toEqual(['a', 'b']);
	});

	it('stands a hand-filed record in the compartment it was given', () => {
		const placement = { unitId: 'one', row: 2, column: 1, position: 1 };
		const shelves = arrangeShelves(
			[],
			[unit('one', 2, 2)],
			[
				{
					release: release('painkiller', 'Judas Priest', placement),
					placement,
				},
			]
		);
		const cells = shelves[0].compartments;

		/* Row 2, slot 1 of a two-wide unit is the third compartment. */
		expect(cells).toHaveLength(4);
		expect(cells[2].items.map((item) => item.id)).toEqual(['painkiller']);
		expect(held(cells)).toEqual([cells[2].key]);
	});

	it('flows the packed compartments around the hand-filed ones', () => {
		const placement = { unitId: 'one', row: 1, column: 2, position: 1 };
		const shelves = arrangeShelves(
			['a', 'b'].map(compartment),
			[unit('one', 2, 2)],
			[
				{
					release: release('painkiller', 'Judas Priest', placement),
					placement,
				},
			]
		);

		expect(
			shelves[0].compartments.map((cell) => cell.items[0]?.id ?? '')
		).toEqual(['a', 'painkiller', 'b', '']);
	});

	it('keeps the order the collector filed a compartment in', () => {
		const spot = { unitId: 'one', row: 1, column: 1 };
		const second = { ...spot, position: 2 };
		const first = { ...spot, position: 1 };
		const shelves = arrangeShelves(
			[],
			[unit('one', 1, 1)],
			[
				{ release: release('b', 'Slayer', second), placement: second },
				{ release: release('a', 'Accept', first), placement: first },
			]
		);

		expect(shelves[0].compartments[0].items.map((item) => item.id)).toEqual(
			['a', 'b']
		);
		expect(shelves[0].compartments[0].label).toBe('Accept – Slayer');
	});
});

describe('splitByPlacement', () => {
	const units = [unit('one', 2, 2)];

	it('leaves a record the shelf files itself among the loose ones', () => {
		const { placed, loose } = splitByPlacement([release('a')], units);

		expect(placed).toEqual([]);
		expect(loose.map((item) => item.id)).toEqual(['a']);
	});

	it('takes a record filed by hand out of the packing', () => {
		const filed = release('a', 'Accept', {
			unitId: 'one',
			row: 2,
			column: 2,
			position: 1,
		});
		const { placed, loose } = splitByPlacement([filed], units);

		expect(loose).toEqual([]);
		expect(placed.map((entry) => entry.release.id)).toEqual(['a']);
	});

	it('frees a record whose compartment the furniture no longer has', () => {
		const gone = release('a', 'Accept', {
			unitId: 'one',
			row: 9,
			column: 1,
			position: 1,
		});
		const elsewhere = release('b', 'Slayer', {
			unitId: 'thrown-out',
			row: 1,
			column: 1,
			position: 1,
		});
		const { placed, loose } = splitByPlacement([gone, elsewhere], units);

		expect(placed).toEqual([]);
		expect(loose.map((item) => item.id)).toEqual(['a', 'b']);
	});
});
