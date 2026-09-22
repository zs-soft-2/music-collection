import { CollectionItemPlacement } from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import {
	MAX_SHELF_POSITION,
	nextPosition,
	placementInLayout,
	placementsForDrop,
	placementsLeftBehind,
	unitSpots,
} from './shelf-placement';
import { ShelfUnitLayout } from './shelf-layout.setting';

const units: ShelfUnitLayout[] = [
	{ id: 'one', name: 'Living room', rows: 2, columns: 3 },
];

describe('placementInLayout', () => {
	it('keeps a place the drawn furniture has', () => {
		expect(
			placementInLayout(
				{ unitId: 'one', row: 2, column: 3, position: 4 },
				units
			)
		).toEqual({ unitId: 'one', row: 2, column: 3, position: 4 });
	});

	it('drops a place in a unit that is gone', () => {
		expect(
			placementInLayout(
				{ unitId: 'sold', row: 1, column: 1, position: 1 },
				units
			)
		).toBeNull();
	});

	it('drops a place the unit was redrawn out of', () => {
		expect(
			placementInLayout(
				{ unitId: 'one', row: 3, column: 1, position: 1 },
				units
			)
		).toBeNull();
	});

	it('drops what was never a place at all', () => {
		expect(placementInLayout(null, units)).toBeNull();
		expect(
			placementInLayout(
				{
					unitId: 'one',
					row: 0,
					column: 1,
					position: 1,
				},
				units
			)
		).toBeNull();
		expect(
			placementInLayout(
				{
					unitId: 'one',
					row: 1,
					column: 1,
					position: MAX_SHELF_POSITION + 1,
				},
				units
			)
		).toBeNull();
	});
});

describe('unitSpots', () => {
	it('reads the unit out top left to bottom right', () => {
		expect(unitSpots(units[0]).map((spot) => spot.label)).toEqual([
			'Row 1 · Slot 1',
			'Row 1 · Slot 2',
			'Row 1 · Slot 3',
			'Row 2 · Slot 1',
			'Row 2 · Slot 2',
			'Row 2 · Slot 3',
		]);
	});
});

describe('nextPosition', () => {
	it('starts a compartment nothing stands in', () => {
		expect(nextPosition([], 'one', 1, 1)).toBe(1);
	});

	it('goes behind what is already filed there', () => {
		const filed = [
			{ unitId: 'one', row: 1, column: 1, position: 1 },
			{ unitId: 'one', row: 1, column: 1, position: 4 },
			{ unitId: 'one', row: 1, column: 2, position: 9 },
		];

		expect(nextPosition(filed, 'one', 1, 1)).toBe(5);
	});

	it('stacks at the end of a compartment that is full', () => {
		const filed = [
			{ unitId: 'one', row: 1, column: 1, position: MAX_SHELF_POSITION },
		];

		expect(nextPosition(filed, 'one', 1, 1)).toBe(MAX_SHELF_POSITION);
	});
});

function record(
	id: string,
	placement: CollectionItemPlacement | null = null
): ReleaseView {
	return {
		id,
		albumId: `album-${id}`,
		releaseId: null,
		title: id,
		artistId: 'artist',
		artistName: 'Judas Priest',
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

describe('placementsForDrop', () => {
	const spot = { unitId: 'one', row: 1, column: 2 };

	it('files the whole compartment the collector arranged', () => {
		const moved = record('c');
		const shown = [record('a'), record('b')];

		expect(placementsForDrop(shown, moved, spot, 1)).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
			{ releaseId: 'b', placement: { ...spot, position: 3 } },
		]);
	});

	it('drops a record at the end when it is let go past the last spine', () => {
		const moved = record('c');
		const shown = [record('a'), record('b')];

		expect(
			placementsForDrop(shown, moved, spot, 9).map(
				(move) => move.releaseId
			)
		).toEqual(['a', 'b', 'c']);
	});

	it('moves a record inside the compartment it already stands in', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });

		/* b to the front: both change place, so both are written. */
		expect(placementsForDrop([a, b], b, spot, 0)).toEqual([
			{ releaseId: 'b', placement: { ...spot, position: 1 } },
			{ releaseId: 'a', placement: { ...spot, position: 2 } },
		]);
	});

	it('writes nothing when the record is let go where it already stands', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });

		expect(placementsForDrop([a, b], b, spot, 1)).toEqual([]);
	});

	it('leaves out what a compartment cannot hold', () => {
		const shown = Array.from({ length: MAX_SHELF_POSITION }, (_, index) =>
			record(`r${index}`)
		);
		const moved = record('late');

		expect(placementsForDrop(shown, moved, spot, 0)).toHaveLength(
			MAX_SHELF_POSITION
		);
	});
});

describe('placementsLeftBehind', () => {
	const spot = { unitId: 'one', row: 1, column: 1 };

	it('gives the shelf-packed compartment to the collector, gap and all', () => {
		const moved = record('b');
		const shown = [record('a'), moved, record('c')];

		/* Two left where three stood: nothing may slide into the third place. */
		expect(placementsLeftBehind(shown, moved, spot)).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
		]);
	});

	it('writes nothing for a compartment already filed by hand', () => {
		const a = record('a', { ...spot, position: 1 });
		const moved = record('b', { ...spot, position: 2 });
		const c = record('c', { ...spot, position: 3 });

		expect(placementsLeftBehind([a, moved, c], moved, spot)).toEqual([]);
	});

	it('leaves alone the records that already stand where they would be put', () => {
		const a = record('a', { ...spot, position: 1 });
		const moved = record('b');
		const c = record('c');

		expect(placementsLeftBehind([a, moved, c], moved, spot)).toEqual([
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
		]);
	});

	it('empties out with the last record taken from it', () => {
		const moved = record('a');

		expect(placementsLeftBehind([moved], moved, spot)).toEqual([]);
	});
});
