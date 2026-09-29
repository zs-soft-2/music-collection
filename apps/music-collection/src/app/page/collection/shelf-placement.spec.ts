import { CollectionItemPlacement } from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import {
	maxPositionIn,
	nextPosition,
	placementInLayout,
	placementsForDrop,
	placementsLeftBehind,
	placementsToFreeze,
	placementsToRelease,
	shelfSizeOf,
	unitSpots,
} from './shelf-placement';
import { DEFAULT_CUBBY, ShelfUnitLayout } from './shelf-layout.setting';

const units: ShelfUnitLayout[] = [
	{
		id: 'one',
		name: 'Living room',
		rows: 2,
		columns: 3,
		cubby: DEFAULT_CUBBY,
	},
];

/** A Kallax cubby goes 66 sleeves deep, which is as far as filing goes. */
const FURTHEST = maxPositionIn(units[0]);

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
					position: FURTHEST + 1,
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

describe('maxPositionIn', () => {
	it('goes as far along as the compartment is long', () => {
		expect(FURTHEST).toBe(66);
		expect(
			maxPositionIn({
				...units[0],
				cubby: { height: 3, length: 150, stance: 'across' },
			})
		).toBe(30);
	});
});

describe('shelfSizeOf', () => {
	it('measures a plain copy by its medium', () => {
		expect(shelfSizeOf(record('a'))).toEqual({
			height: 8,
			thickness: 6,
		});
	});

	it('measures a box set as the slab it is, whatever its medium', () => {
		expect(shelfSizeOf({ ...record('a'), boxSet: true })).toEqual({
			height: 8,
			thickness: 30,
		});
	});

	it('widens a gatefold jacket over the plain sleeve', () => {
		expect(
			shelfSizeOf({ ...record('a'), editions: ['gatefold'] }).thickness
		).toBe(10);
	});

	it('adds up what the packaging of one copy comes to', () => {
		expect(
			shelfSizeOf({
				...record('a'),
				editions: ['gatefold', 'deluxe edition'],
				weight: 180,
			}).thickness
		).toBe(14);
	});
});

describe('nextPosition', () => {
	it('starts a compartment nothing stands in', () => {
		expect(nextPosition([], units[0], 1, 1)).toBe(1);
	});

	it('goes behind what is already filed there', () => {
		const filed = [
			{ unitId: 'one', row: 1, column: 1, position: 1 },
			{ unitId: 'one', row: 1, column: 1, position: 4 },
			{ unitId: 'one', row: 1, column: 2, position: 9 },
		];

		expect(nextPosition(filed, units[0], 1, 1)).toBe(5);
	});

	it('stacks at the end of a compartment that is full', () => {
		const filed = [
			{ unitId: 'one', row: 1, column: 1, position: FURTHEST },
		];

		expect(nextPosition(filed, units[0], 1, 1)).toBe(FURTHEST);
	});
});

describe('placementsToFreeze', () => {
	/** A shelf as it is drawn: two compartments, and what stands in them. */
	const shelf = (
		compartments: {
			spot: { unitId: string; row: number; column: number } | null;
			items: ReleaseView[];
		}[]
	) => [
		{
			compartments: compartments.map((compartment, index) => ({
				key: `c${index}`,
				label: '',
				...compartment,
			})),
		},
	];

	it('gives every record the place it is drawn in', () => {
		const shelves = shelf([
			{
				spot: { unitId: 'one', row: 1, column: 1 },
				items: [record('a'), record('b')],
			},
		]);

		expect(placementsToFreeze(shelves)).toEqual([
			{
				releaseId: 'a',
				placement: { unitId: 'one', row: 1, column: 1, position: 1 },
			},
			{
				releaseId: 'b',
				placement: { unitId: 'one', row: 1, column: 1, position: 2 },
			},
		]);
	});

	it('writes nothing for a shelf already kept', () => {
		const held = (position: number) => ({
			unitId: 'one',
			row: 1,
			column: 1,
			position,
		});
		const shelves = shelf([
			{
				spot: { unitId: 'one', row: 1, column: 1 },
				items: [record('a', held(1)), record('b', held(2))],
			},
		]);

		expect(placementsToFreeze(shelves)).toEqual([]);
	});

	it('leaves out what no drawn compartment holds', () => {
		// The overflow: records the furniture has no room for. There is no
		// compartment to name, so freezing cannot reach them.
		const shelves = shelf([{ spot: null, items: [record('a')] }]);

		expect(placementsToFreeze(shelves)).toEqual([]);
	});

	it('numbers each compartment from one', () => {
		const shelves = shelf([
			{
				spot: { unitId: 'one', row: 1, column: 1 },
				items: [record('a')],
			},
			{
				spot: { unitId: 'one', row: 1, column: 2 },
				items: [record('b')],
			},
		]);

		expect(
			placementsToFreeze(shelves).map(
				({ placement }) => placement.position
			)
		).toEqual([1, 1]);
	});
});

describe('placementsToRelease', () => {
	it('hands back every record that holds a place', () => {
		const placement = { unitId: 'one', row: 1, column: 1, position: 1 };

		expect(
			placementsToRelease([record('a', placement), record('b')])
		).toEqual([{ releaseId: 'a', placement: null }]);
	});

	it('writes nothing for a shelf that was never kept', () => {
		expect(placementsToRelease([record('a'), record('b')])).toEqual([]);
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
		generic: false,
		placement,
	};
}

describe('placementsForDrop', () => {
	const spot = { unitId: 'one', row: 1, column: 2 };

	it('files the whole compartment the collector arranged', () => {
		const moved = record('c');
		const shown = [record('a'), record('b')];

		expect(placementsForDrop(shown, moved, spot, 1, FURTHEST)).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
			{ releaseId: 'b', placement: { ...spot, position: 3 } },
		]);
	});

	it('drops a record at the end when it is let go past the last spine', () => {
		const moved = record('c');
		const shown = [record('a'), record('b')];

		expect(
			placementsForDrop(shown, moved, spot, 9, FURTHEST).map(
				(move) => move.releaseId
			)
		).toEqual(['a', 'b', 'c']);
	});

	it('moves a record inside the compartment it already stands in', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });

		/* b to the front: both change place, so both are written. */
		expect(placementsForDrop([a, b], b, spot, 0, FURTHEST)).toEqual([
			{ releaseId: 'b', placement: { ...spot, position: 1 } },
			{ releaseId: 'a', placement: { ...spot, position: 2 } },
		]);
	});

	it('writes nothing when the record is let go where it already stands', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });

		expect(placementsForDrop([a, b], b, spot, 1, FURTHEST)).toEqual([]);
	});

	it('leaves out what a compartment cannot hold', () => {
		const shown = Array.from({ length: FURTHEST }, (_, index) =>
			record(`r${index}`)
		);
		const moved = record('late');

		expect(placementsForDrop(shown, moved, spot, 0, FURTHEST)).toHaveLength(
			FURTHEST
		);
	});
});

describe('placementsLeftBehind', () => {
	const spot = { unitId: 'one', row: 1, column: 1 };

	it('gives the shelf-packed compartment to the collector, gap and all', () => {
		const moved = record('b');
		const shown = [record('a'), moved, record('c')];

		/* Two left where three stood: nothing may slide into the third place. */
		expect(placementsLeftBehind(shown, moved, spot, FURTHEST)).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
		]);
	});

	it('writes nothing for a compartment already filed by hand', () => {
		const a = record('a', { ...spot, position: 1 });
		const moved = record('b', { ...spot, position: 2 });
		const c = record('c', { ...spot, position: 3 });

		expect(
			placementsLeftBehind([a, moved, c], moved, spot, FURTHEST)
		).toEqual([]);
	});

	it('leaves alone the records that already stand where they would be put', () => {
		const a = record('a', { ...spot, position: 1 });
		const moved = record('b');
		const c = record('c');

		expect(
			placementsLeftBehind([a, moved, c], moved, spot, FURTHEST)
		).toEqual([{ releaseId: 'c', placement: { ...spot, position: 2 } }]);
	});

	it('empties out with the last record taken from it', () => {
		const moved = record('a');

		expect(placementsLeftBehind([moved], moved, spot, FURTHEST)).toEqual(
			[]
		);
	});
});
