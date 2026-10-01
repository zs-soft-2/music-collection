import { CollectionItemPlacement } from '@music-collection/api';

import { MediaFormat, ReleaseView } from '../../shared/music-ui';

import {
	arrangeShelves,
	shelfMatches,
	shelfPlaceLabel,
	splitByPlacement,
} from './collection.mapper';
import { ReleaseGroup } from './collection.model';
import { ShelfCubby, ShelfUnitLayout } from './shelf-layout.setting';

/**
 * A compartment with room for exactly one LP. Most of what is checked here
 * is which compartment a record lands in, not how many go in one, so the
 * furniture is drawn to make every record fill a cubby of its own.
 */
const ONE_RECORD: ShelfCubby = { height: 8, length: 6, stance: 'across' };

function release(
	id: string,
	artistName = 'Judas Priest',
	placement: CollectionItemPlacement | null = null,
	format: MediaFormat = 'vinyl'
): ReleaseView {
	return {
		id,
		albumId: `album-${id}`,
		releaseId: null,
		title: id,
		artistId: 'artist',
		artistName,
		coverUrl: null,
		format,
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
		generic: false,
		placement,
	};
}

function compartment(key: string): ReleaseGroup {
	return { key, label: key.toUpperCase(), items: [release(key)] };
}

function unit(
	id: string,
	rows: number,
	columns: number,
	cubby: ShelfCubby = ONE_RECORD
): ShelfUnitLayout {
	return { id, name: id, rows, columns, cubby };
}

/** The records standing in each compartment that has any, in grid order. */
function held(compartments: ReleaseGroup[]): string[] {
	return compartments
		.filter((group) => group.items.length)
		.map((group) => group.items.map((item) => item.id).join(','));
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
		expect(held(cells)).toEqual(['painkiller']);
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

describe('arrangeShelves, by what a compartment holds', () => {
	const kallax = { height: 8, length: 330, stance: 'across' } as const;
	const cdRack = { height: 3, length: 330, stance: 'across' } as const;
	const group = (key: string, items: ReleaseView[]): ReleaseGroup => ({
		key,
		label: key.toUpperCase(),
		items,
	});

	it('fills a compartment by length, not by a count', () => {
		const records = Array.from({ length: 70 }, (_, at) =>
			release(`r${at}`)
		);
		const shelves = arrangeShelves(
			[group('a', records)],
			[unit('one', 1, 2, kallax)]
		);

		/* 330 mm at 6 mm a sleeve, and the rest in the next compartment. */
		expect(shelves[0].compartments[0].items).toHaveLength(55);
		expect(shelves[0].compartments[1].items).toHaveLength(15);
	});

	it('takes far more CDs than records into the same compartment', () => {
		const cds = Array.from({ length: 40 }, (_, at) =>
			release(`c${at}`, 'Slayer', null, 'cd')
		);
		const shelves = arrangeShelves(
			[group('a', cds)],
			[unit('one', 1, 1, kallax)]
		);

		expect(shelves[0].compartments[0].items).toHaveLength(33);
	});

	it('passes a record over a compartment nothing that tall fits in', () => {
		const shelves = arrangeShelves(
			[
				group('a', [
					release('lp', 'Judas Priest'),
					release('cd', 'Slayer', null, 'cd'),
				]),
			],
			[unit('rack', 1, 1, cdRack), unit('shelf', 1, 1, kallax)]
		);

		expect(held(shelves[0].compartments)).toEqual(['cd']);
		expect(held(shelves[1].compartments)).toEqual(['lp']);
	});

	it('shows a record nothing drawn is tall enough for as off the shelf', () => {
		const shelves = arrangeShelves(
			[group('a', [release('lp')])],
			[unit('rack', 1, 1, cdRack)]
		);

		expect(held(shelves[0].compartments)).toEqual([]);
		expect(shelves[1].overflow).toBe(true);
		expect(held(shelves[1].compartments)).toEqual(['lp']);
	});

	it('numbers a run that carries on over several compartments', () => {
		const records = Array.from({ length: 3 }, (_, at) => release(`r${at}`));
		const shelves = arrangeShelves(
			[group('priest', records)],
			[unit('one', 1, 3)]
		);

		expect(shelves[0].compartments.map((cell) => cell.label)).toEqual([
			'PRIEST · 1/3',
			'PRIEST · 2/3',
			'PRIEST · 3/3',
		]);
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

describe('shelfMatches', () => {
	/** A shelf of two units, one record per compartment. */
	function shelf(records: ReleaseView[]) {
		return arrangeShelves(
			[{ key: 'all', label: 'ALL', items: records }],
			[unit('one', 1, 2), unit('two', 1, 1)]
		);
	}

	it('finds nothing while nothing is being looked for', () => {
		expect(shelfMatches(shelf([release('a')]), '  ')).toEqual([]);
	});

	it('says which compartment of which unit a record stands in', () => {
		const shelves = shelf([
			release('painkiller', 'Judas Priest'),
			release('reign', 'Slayer'),
			release('tomb', 'Slayer'),
		]);

		expect(shelfMatches(shelves, 'slayer')).toEqual([
			expect.objectContaining({
				id: 'reign',
				unitName: 'one',
				spot: { unitId: 'one', row: 1, column: 2 },
				offShelf: false,
			}),
			expect.objectContaining({
				id: 'tomb',
				unitName: 'two',
				spot: { unitId: 'two', row: 1, column: 1 },
			}),
		]);
	});

	it('matches a title as readily as an artist, whatever the case', () => {
		const shelves = shelf([release('Painkiller', 'Judas Priest')]);

		expect(shelfMatches(shelves, 'PAINKILL').map((m) => m.id)).toEqual([
			'Painkiller',
		]);
	});

	it('owns up to a record no drawn compartment was left for', () => {
		const records = Array.from({ length: 4 }, (_, at) =>
			release(`r${at}`, 'Slayer')
		);
		const found = shelfMatches(shelf(records), 'slayer');

		expect(found).toHaveLength(4);
		expect(found[3]).toEqual(
			expect.objectContaining({ offShelf: true, spot: null })
		);
	});
});

describe('shelfPlaceLabel', () => {
	const words = {
		t: (key: string, params?: Record<string, unknown>) =>
			key === 'ui.recordShelf.rowSlot'
				? `Row ${params?.['row']} · Slot ${params?.['slot']}`
				: 'Off the shelf',
		catalog: (_group: never, value: string) => value,
	};
	const place = {
		unitName: 'Kallax',
		spot: { unitId: 'one', row: 2, column: 3 },
		offShelf: false,
		compartment: 'SLAYER',
		cell: 'one:2:3',
	};

	it('names the unit and the compartment of it', () => {
		expect(shelfPlaceLabel(place, words)).toBe('Kallax · Row 2 · Slot 3');
	});

	it('leaves out a unit with no name of its own', () => {
		expect(shelfPlaceLabel({ ...place, unitName: '' }, words)).toBe(
			'Row 2 · Slot 3'
		);
	});

	it('falls back to the compartment where nothing is drawn', () => {
		expect(shelfPlaceLabel({ ...place, spot: null }, words)).toBe('SLAYER');
	});

	it('says plainly that a record is off the shelf', () => {
		expect(shelfPlaceLabel({ ...place, offShelf: true }, words)).toBe(
			'Off the shelf'
		);
	});
});
