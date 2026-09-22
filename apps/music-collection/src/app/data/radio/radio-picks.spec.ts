import {
	RadioAlbum,
	byTaste,
	distinct,
	newest,
	onShelf,
	shuffle,
	styleWeights,
} from './radio-picks';

/** A random that walks 0, 0.1, 0.2 … so a shuffle can be predicted. */
const steppedRandom = () => {
	let step = 0;

	return () => ((step++ % 10) / 10) as number;
};

const album = (
	uid: string,
	styles: string[] = [],
	addedAt = 0
): RadioAlbum => ({ uid, styles, addedAt });

describe('shuffle', () => {
	it('keeps every record, and only once', () => {
		const shuffled = shuffle(['a', 'b', 'c', 'd'], steppedRandom());

		expect([...shuffled].sort()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('leaves the list it was given alone', () => {
		const items = ['a', 'b', 'c'];

		shuffle(items, steppedRandom());
		expect(items).toEqual(['a', 'b', 'c']);
	});
});

describe('styleWeights', () => {
	it('weighs the styles the collector owns most', () => {
		const weights = styleWeights(
			[
				{ styles: ['Prog', 'Rock'] },
				{ styles: ['Prog'] },
				{ styles: ['Jazz'] },
			],
			2
		);

		expect([...weights.entries()]).toEqual([
			['Prog', 2],
			['Jazz', 1],
		]);
	});

	it('has no taste to report on an empty shelf', () => {
		expect(styleWeights([], 5).size).toBe(0);
	});
});

describe('byTaste', () => {
	const weights = new Map([
		['Prog', 3],
		['Jazz', 1],
	]);

	it('leaves out what answers to nothing the collector owns', () => {
		const picked = byTaste(
			[album('a', ['Prog']), album('b', ['Techno'])],
			weights,
			5,
			steppedRandom()
		);

		expect(picked).toEqual(['a']);
	});

	it('keeps to the length asked for', () => {
		const albums = Array.from({ length: 30 }, (unused, at) =>
			album(`a${at}`, ['Prog'])
		);

		expect(byTaste(albums, weights, 5, steppedRandom())).toHaveLength(5);
	});

	it('has nothing to play without a taste', () => {
		expect(byTaste([album('a', ['Prog'])], new Map(), 5)).toEqual([]);
	});
});

describe('newest', () => {
	it('puts the latest arrival first', () => {
		expect(
			newest(
				[album('a', [], 100), album('b', [], 300), album('c', [], 200)],
				2
			)
		).toEqual(['b', 'c']);
	});
});

describe('distinct', () => {
	it('plays a record owned twice once', () => {
		expect(distinct(['a', 'b', 'a'])).toEqual(['a', 'b']);
	});
});

describe('onShelf', () => {
	const copy = (
		albumUid: string,
		placement: {
			unitId: string;
			row: number;
			column: number;
			position: number;
		} | null,
		addedAt = 0
	) => ({ albumUid, placement, addedAt });

	const place = (row: number, column: number, position: number) => ({
		unitId: 'living-room',
		row,
		column,
		position,
	});

	it('reads one unit out the way it stands', () => {
		const copies = [
			copy('c', place(2, 1, 1)),
			copy('a', place(1, 1, 1)),
			copy('b', place(1, 1, 2)),
			copy('elsewhere', { ...place(1, 1, 1), unitId: 'attic' }),
		];

		expect(onShelf(copies, { unitId: 'living-room' })).toEqual([
			'a',
			'b',
			'c',
		]);
	});

	it('reaches into one compartment', () => {
		const copies = [
			copy('a', place(1, 1, 1)),
			copy('b', place(1, 2, 1)),
			copy('c', place(2, 1, 1)),
		];

		expect(
			onShelf(copies, { unitId: 'living-room', row: 1, column: 2 })
		).toEqual(['b']);
	});

	it('takes the whole collection when no unit is named', () => {
		const copies = [copy('a', null, 200), copy('b', null, 100)];

		expect(onShelf(copies, {})).toEqual(['b', 'a']);
	});

	it('leaves an unfiled copy out of a unit', () => {
		expect(onShelf([copy('a', null)], { unitId: 'living-room' })).toEqual(
			[]
		);
	});

	it('plays a record owned in two pressings once', () => {
		const copies = [copy('a', place(1, 1, 1)), copy('a', place(1, 1, 2))];

		expect(onShelf(copies, { unitId: 'living-room' })).toEqual(['a']);
	});
});
