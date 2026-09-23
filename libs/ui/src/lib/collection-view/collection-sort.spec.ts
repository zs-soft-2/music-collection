import { orderOf, sortItems, sortedBy } from './collection-sort';

interface Record {
	name?: string;
	year?: number;
	artist?: { name?: string };
}

const nirvana: Record = {
	name: 'Nevermind',
	year: 1991,
	artist: { name: 'Nirvana' },
};
const pixies: Record = {
	name: 'Doolittle',
	year: 1989,
	artist: { name: 'Pixies' },
};
const unnamed: Record = { artist: {} };

describe('sortItems', () => {
	const names = (items: Record[]): (string | undefined)[] =>
		items.map(({ name }) => name);

	it('leaves the list as it came when nothing sorts it', () => {
		const items = [nirvana, pixies];

		expect(sortItems(items, [])).toBe(items);
	});

	it('sorts by a column, both ways', () => {
		expect(
			names(sortItems([nirvana, pixies], [{ field: 'name', order: 1 }]))
		).toEqual(['Doolittle', 'Nevermind']);

		expect(
			names(sortItems([pixies, nirvana], [{ field: 'name', order: -1 }]))
		).toEqual(['Nevermind', 'Doolittle']);
	});

	it('sorts by numbers as numbers', () => {
		expect(
			sortItems(
				[{ year: 1991 }, { year: 999 }],
				[{ field: 'year', order: 1 }]
			)
		).toEqual([{ year: 999 }, { year: 1991 }]);
	});

	it('sorts by a field of a field', () => {
		expect(
			names(
				sortItems(
					[nirvana, pixies],
					[{ field: 'artist.name', order: -1 }]
				)
			)
		).toEqual(['Doolittle', 'Nevermind']);
	});

	it('leaves the list it was given alone', () => {
		const items = [nirvana, pixies];

		sortItems(items, [{ field: 'name', order: 1 }]);

		expect(items).toEqual([nirvana, pixies]);
	});

	it('puts the empty cells last, whichever way the column is turned', () => {
		expect(
			names(
				sortItems(
					[unnamed, nirvana, pixies],
					[{ field: 'name', order: 1 }]
				)
			)
		).toEqual(['Doolittle', 'Nevermind', undefined]);

		expect(
			names(
				sortItems(
					[unnamed, nirvana, pixies],
					[{ field: 'name', order: -1 }]
				)
			)
		).toEqual(['Nevermind', 'Doolittle', undefined]);
	});

	it('breaks the ties with the next level', () => {
		const items = [
			{ name: 'B', year: 1991 },
			{ name: 'A', year: 1991 },
			{ name: 'C', year: 1989 },
		];

		expect(
			names(
				sortItems(items, [
					{ field: 'year', order: 1 },
					{ field: 'name', order: 1 },
				])
			)
		).toEqual(['C', 'A', 'B']);
	});
});

describe('sortedBy', () => {
	it('sorts by the column on its own', () => {
		expect(sortedBy([{ field: 'year', order: 1 }], 'name', false)).toEqual([
			{ field: 'name', order: 1 },
		]);
	});

	it('turns the column that already sorts the list around', () => {
		expect(sortedBy([{ field: 'name', order: 1 }], 'name', false)).toEqual([
			{ field: 'name', order: -1 },
		]);

		expect(sortedBy([{ field: 'name', order: -1 }], 'name', false)).toEqual(
			[{ field: 'name', order: 1 }]
		);
	});

	it('adds a further level when it is asked to', () => {
		expect(sortedBy([{ field: 'year', order: 1 }], 'name', true)).toEqual([
			{ field: 'year', order: 1 },
			{ field: 'name', order: 1 },
		]);
	});

	it('turns a level around in its place', () => {
		expect(
			sortedBy(
				[
					{ field: 'year', order: 1 },
					{ field: 'name', order: 1 },
				],
				'year',
				true
			)
		).toEqual([
			{ field: 'year', order: -1 },
			{ field: 'name', order: 1 },
		]);
	});
});

describe('orderOf', () => {
	it('says which way a column sorts, and when it does not', () => {
		const levels = [{ field: 'name', order: -1 as const }];

		expect(orderOf(levels, 'name')).toBe(-1);
		expect(orderOf(levels, 'year')).toBe(0);
	});
});
