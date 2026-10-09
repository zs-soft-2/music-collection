import { DONUT_SLICE_LIMIT, toDonutSlices } from './donut-slices';

describe('toDonutSlices', () => {
	it('ranks the classes by size and hands out the hues in order', () => {
		const slices = toDonutSlices(
			[
				{ label: 'Black Metal', count: 10 },
				{ label: 'Death Metal', count: 30 },
			],
			'Egyéb'
		);

		expect(slices.map((slice) => slice.label)).toEqual([
			'Death Metal',
			'Black Metal',
		]);
		expect(slices.map((slice) => slice.color)).toEqual([
			'var(--mc-series-1)',
			'var(--mc-series-2)',
		]);
		expect(slices.map((slice) => slice.share)).toEqual([75, 25]);
	});

	it('sums everything past the sixth class into one grey tail', () => {
		const data = Array.from({ length: DONUT_SLICE_LIMIT + 3 }, (_, i) => ({
			label: `style-${i}`,
			count: 10 - i,
		}));

		const slices = toDonutSlices(data, 'Egyéb');

		expect(slices).toHaveLength(DONUT_SLICE_LIMIT + 1);

		const tail = slices[slices.length - 1];

		expect(tail.label).toBe('Egyéb');
		expect(tail.color).toBe('var(--mc-series-other)');
		// The three that did not get a hue: 4 + 3 + 2.
		expect(tail.count).toBe(9);
	});

	it('leaves the tail off when every class got a hue of its own', () => {
		const slices = toDonutSlices(
			[
				{ label: 'a', count: 2 },
				{ label: 'b', count: 1 },
			],
			'Egyéb'
		);

		expect(slices.map((slice) => slice.label)).toEqual(['a', 'b']);
	});

	it('keeps a single copy visible rather than letting the gap eat it', () => {
		const slices = toDonutSlices(
			[
				{ label: 'big', count: 999 },
				{ label: 'one', count: 1 },
			],
			'Egyéb'
		);

		const drawn = Number(slices[1].dash.split(' ')[0]);

		expect(drawn).toBeGreaterThan(0);
	});

	it('lays the arcs end to end, each starting where the last one did not', () => {
		const slices = toDonutSlices(
			[
				{ label: 'a', count: 1 },
				{ label: 'b', count: 1 },
			],
			'Egyéb'
		);

		expect(slices[0].offset).toBe(0);
		// Half the circumference of a radius-42 ring.
		expect(slices[1].offset).toBeCloseTo(-Math.PI * 42, 5);
	});

	it('has nothing to draw for an empty collection', () => {
		expect(toDonutSlices([], 'Egyéb')).toEqual([]);
		expect(toDonutSlices([{ label: 'a', count: 0 }], 'Egyéb')).toEqual([]);
	});
});
