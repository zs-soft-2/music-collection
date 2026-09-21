import { arrangeShelves } from './collection.mapper';
import { ReleaseGroup } from './collection.model';
import { ShelfUnitLayout } from './shelf-layout.setting';

function compartment(key: string): ReleaseGroup {
	return { key, label: key.toUpperCase(), items: [] };
}

function unit(id: string, rows: number, columns: number): ShelfUnitLayout {
	return { id, name: id, rows, columns };
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
		expect(shelves[0].compartments.map((held) => held.key)).toEqual([
			'a',
			'b',
			'c',
			'd',
		]);
		expect(shelves[1].compartments.map((held) => held.key)).toEqual(['e']);
	});

	it('keeps the compartments a unit was drawn with, filled or not', () => {
		const shelves = arrangeShelves([compartment('a')], [unit('one', 2, 3)]);

		expect(shelves[0].compartments).toHaveLength(1);
		expect(shelves[0].blanks).toBe(5);
	});

	it('shows what no drawn compartment was left for', () => {
		const shelves = arrangeShelves(['a', 'b', 'c'].map(compartment), [
			unit('one', 1, 2),
		]);

		expect(shelves).toHaveLength(2);
		expect(shelves[1].overflow).toBe(true);
		expect(shelves[1].compartments.map((held) => held.key)).toEqual(['c']);
	});

	it('does not add an overflow unit when everything fits', () => {
		const shelves = arrangeShelves(['a', 'b'].map(compartment), [
			unit('one', 1, 2),
		]);

		expect(shelves).toHaveLength(1);
		expect(shelves[0].blanks).toBe(0);
	});
});
