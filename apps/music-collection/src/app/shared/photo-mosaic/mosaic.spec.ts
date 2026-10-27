import {
	MOSAIC_COLUMNS,
	MOSAIC_ROWS,
	MOSAIC_TILES,
	mosaicGrain,
	mosaicTiles,
} from './mosaic';

describe('mosaicTiles', () => {
	it('cuts the picture into the whole grid, in reading order', () => {
		const tiles = mosaicTiles(0.5, 0);

		expect(tiles).toHaveLength(MOSAIC_TILES);
		expect(tiles[0]).toMatchObject({ column: 0, row: 0 });
		expect(tiles[MOSAIC_COLUMNS]).toMatchObject({ column: 0, row: 1 });
		expect(tiles[MOSAIC_TILES - 1]).toMatchObject({
			column: MOSAIC_COLUMNS - 1,
			row: MOSAIC_ROWS - 1,
		});
	});

	it('leaves the picture whole before the crossing starts', () => {
		for (const tile of mosaicTiles(0, 3)) {
			expect(tile.opacity).toBe(1);
			/* A transform would put the tile on a surface of its own, and
			 * surfaces that should abut can land a fraction of a pixel
			 * apart. */
			expect(tile.transform).toBe('none');
		}
	});

	it('has taken all of it away by the end', () => {
		for (const tile of mosaicTiles(1, 3)) {
			expect(tile.opacity).toBe(0);
		}
	});

	it('takes the tiles one at a time rather than all at once', () => {
		const half = mosaicTiles(0.5, 2);
		const gone = half.filter((tile) => tile.opacity === 0);
		const standing = half.filter((tile) => tile.opacity === 1);

		expect(gone.length).toBeGreaterThan(0);
		expect(standing.length).toBeGreaterThan(0);
	});

	it('breaks the same turn up the same way, every time', () => {
		expect(mosaicTiles(0.4, 11)).toEqual(mosaicTiles(0.4, 11));
	});

	it('breaks a later turn up differently', () => {
		expect(mosaicTiles(0.4, 11)).not.toEqual(mosaicTiles(0.4, 12));
	});

	it('holds the picture together for a crossing it cannot count', () => {
		for (const tile of mosaicTiles(Number.NaN, Number.NaN)) {
			expect(tile.opacity).toBe(1);
		}
	});
});

describe('mosaicGrain', () => {
	it('stays inside the unit range', () => {
		for (let index = 0; index < 200; index++) {
			const grain = mosaicGrain(index, index * 7);

			expect(grain).toBeGreaterThanOrEqual(0);
			expect(grain).toBeLessThan(1);
		}
	});

	it('spreads the tiles of one turn across it', () => {
		const grains = Array.from({ length: MOSAIC_TILES }, (_, index) =>
			mosaicGrain(index, 4)
		);

		expect(Math.min(...grains)).toBeLessThan(0.25);
		expect(Math.max(...grains)).toBeGreaterThan(0.75);
	});
});
