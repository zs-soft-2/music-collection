import { CollectionItemPlacement } from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import { ShelfCompartmentView } from './collection.model';

import {
	maxPositionIn,
	nextPosition,
	placementInLayout,
	placementsForDrop,
	placementsForMove,
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

	it('keeps the wall a copy leans on', () => {
		expect(
			placementInLayout(
				{
					unitId: 'one',
					row: 1,
					column: 1,
					side: 'right',
					position: 2,
				},
				units
			)
		).toEqual({
			unitId: 'one',
			row: 1,
			column: 1,
			side: 'right',
			position: 2,
		});
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

	it('counts the two walls of a compartment apart', () => {
		const filed: CollectionItemPlacement[] = [
			{ unitId: 'one', row: 1, column: 1, position: 1 },
			{ unitId: 'one', row: 1, column: 1, position: 2 },
			{ unitId: 'one', row: 1, column: 1, side: 'right', position: 1 },
		];

		expect(nextPosition(filed, units[0], 1, 1)).toBe(3);
		expect(nextPosition(filed, units[0], 1, 1, 'right')).toBe(2);
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
			rightFrom?: number;
		}[]
	) => [
		{
			compartments: compartments.map((compartment, index) => ({
				key: `c${index}`,
				label: '',
				rightFrom: compartment.items.length,
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

	it('numbers the two runs of a compartment from their own walls', () => {
		const shelves = shelf([
			{
				spot: { unitId: 'one', row: 1, column: 1 },
				items: [record('a'), record('far'), record('near')],
				rightFrom: 1,
			},
		]);

		expect(placementsToFreeze(shelves)).toEqual([
			{
				releaseId: 'a',
				placement: { unitId: 'one', row: 1, column: 1, position: 1 },
			},
			{
				releaseId: 'far',
				placement: {
					unitId: 'one',
					row: 1,
					column: 1,
					side: 'right',
					position: 2,
				},
			},
			{
				releaseId: 'near',
				placement: {
					unitId: 'one',
					row: 1,
					column: 1,
					side: 'right',
					position: 1,
				},
			},
		]);
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

		expect(
			placementsForDrop(shown, 2, [moved], spot, 'left', 1, FURTHEST)
		).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
			{ releaseId: 'b', placement: { ...spot, position: 3 } },
		]);
	});

	it('puts an armful down side by side, in the order it was carried', () => {
		const shown = [record('a'), record('b')];
		const carried = [record('c'), record('d')];

		expect(
			placementsForDrop(shown, 2, carried, spot, 'left', 1, FURTHEST)
		).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
			{ releaseId: 'd', placement: { ...spot, position: 3 } },
			{ releaseId: 'b', placement: { ...spot, position: 4 } },
		]);
	});

	it('lets an armful out of this very compartment be reordered in it', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });
		const c = record('c', { ...spot, position: 3 });

		/* b and c picked up and let go in front of a. */
		expect(
			placementsForDrop([a, b, c], 3, [b, c], spot, 'left', 0, FURTHEST)
		).toEqual([
			{ releaseId: 'b', placement: { ...spot, position: 1 } },
			{ releaseId: 'c', placement: { ...spot, position: 2 } },
			{ releaseId: 'a', placement: { ...spot, position: 3 } },
		]);
	});

	it('drops a record at the end when it is let go past the last spine', () => {
		const moved = record('c');
		const shown = [record('a'), record('b')];

		expect(
			placementsForDrop(shown, 2, [moved], spot, 'left', 9, FURTHEST).map(
				(move) => move.releaseId
			)
		).toEqual(['a', 'b', 'c']);
	});

	it('moves a record inside the compartment it already stands in', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });

		/* b to the front: both change place, so both are written. */
		expect(
			placementsForDrop([a, b], 2, [b], spot, 'left', 0, FURTHEST)
		).toEqual([
			{ releaseId: 'b', placement: { ...spot, position: 1 } },
			{ releaseId: 'a', placement: { ...spot, position: 2 } },
		]);
	});

	it('writes nothing when the record is let go where it already stands', () => {
		const a = record('a', { ...spot, position: 1 });
		const b = record('b', { ...spot, position: 2 });

		expect(
			placementsForDrop([a, b], 2, [b], spot, 'left', 1, FURTHEST)
		).toEqual([]);
	});

	it('leaves out what a compartment cannot hold', () => {
		const shown = Array.from({ length: FURTHEST }, (_, index) =>
			record(`r${index}`)
		);
		const moved = record('late');

		expect(
			placementsForDrop(
				shown,
				shown.length,
				[moved],
				spot,
				'left',
				0,
				FURTHEST
			)
		).toHaveLength(FURTHEST);
	});

	it('leans a record on the right wall, counted from that wall', () => {
		const moved = record('c');
		const shown = [record('a'), record('b')];

		/* The left-hand run keeps its numbers; the dropped one starts the
		   other run at the far wall. */
		expect(
			placementsForDrop(shown, 2, [moved], spot, 'right', 0, FURTHEST)
		).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{ releaseId: 'b', placement: { ...spot, position: 2 } },
			{
				releaseId: 'c',
				placement: { ...spot, side: 'right', position: 1 },
			},
		]);
	});

	it('leaves the far end of the compartment still as the left run grows', () => {
		const a = record('a', { ...spot, position: 1 });
		const far = record('far', { ...spot, side: 'right', position: 1 });
		const moved = record('b');

		/* a, then the gap, then far: b joins the left-hand run behind a. */
		expect(
			placementsForDrop([a, far], 1, [moved], spot, 'left', 1, FURTHEST)
		).toEqual([{ releaseId: 'b', placement: { ...spot, position: 2 } }]);
	});

	it('numbers a right-hand run inwards from the wall', () => {
		const moved = record('c');
		const shown = [
			record('a'),
			record('b', { ...spot, side: 'right', position: 1 }),
		];

		/* Dropped before b, which stands against the wall: c is the second
		   one in from it, and b does not move. */
		expect(
			placementsForDrop(shown, 1, [moved], spot, 'right', 0, FURTHEST)
		).toEqual([
			{ releaseId: 'a', placement: { ...spot, position: 1 } },
			{
				releaseId: 'c',
				placement: { ...spot, side: 'right', position: 2 },
			},
		]);
	});
});

describe('placementsForMove', () => {
	const here = { unitId: 'one', row: 1, column: 1 };
	const there = { unitId: 'one', row: 1, column: 2 };
	const cell = (
		spot: { unitId: string; row: number; column: number },
		items: ReleaseView[]
	): ShelfCompartmentView => ({
		key: `${spot.row}-${spot.column}`,
		label: '',
		spot,
		items,
		rightFrom: items.length,
	});
	const furthest = () => FURTHEST;

	it('arranges every compartment an armful was gathered from', () => {
		const a = record('a');
		const b = record('b');
		const c = record('c');
		const d = record('d');
		const from = cell(here, [a, b]);
		const into = cell(there, [c, d]);

		/* One record out of each: both compartments keep their gaps, and
		   the two land side by side in front of what stood there. */
		expect(
			placementsForMove(
				[from, into],
				into,
				there,
				[a, c],
				{ side: 'left', index: 0 },
				furthest
			)
		).toEqual([
			{ releaseId: 'b', placement: { ...here, position: 1 } },
			{ releaseId: 'a', placement: { ...there, position: 1 } },
			{ releaseId: 'c', placement: { ...there, position: 2 } },
			{ releaseId: 'd', placement: { ...there, position: 3 } },
		]);
	});

	it('leaves the compartment it was put back into out of the reckoning', () => {
		const a = record('a');
		const b = record('b');
		const into = cell(here, [a, b]);

		/* Carried out of this compartment and back into it: it is arranged
		   once, as the compartment it landed in. */
		expect(
			placementsForMove(
				[into],
				into,
				here,
				[a],
				{ side: 'left', index: 1 },
				furthest
			)
		).toEqual([
			{ releaseId: 'b', placement: { ...here, position: 1 } },
			{ releaseId: 'a', placement: { ...here, position: 2 } },
		]);
	});
});

describe('placementsLeftBehind', () => {
	const spot = { unitId: 'one', row: 1, column: 1 };

	it('gives the shelf-packed compartment to the collector, gap and all', () => {
		const moved = record('b');
		const shown = [record('a'), moved, record('c')];

		/* Two left where three stood: nothing may slide into the third place. */
		expect(placementsLeftBehind(shown, 3, [moved], spot, FURTHEST)).toEqual(
			[
				{ releaseId: 'a', placement: { ...spot, position: 1 } },
				{ releaseId: 'c', placement: { ...spot, position: 2 } },
			]
		);
	});

	it('writes nothing for a compartment already filed by hand', () => {
		const a = record('a', { ...spot, position: 1 });
		const moved = record('b', { ...spot, position: 2 });
		const c = record('c', { ...spot, position: 3 });

		expect(
			placementsLeftBehind([a, moved, c], 3, [moved], spot, FURTHEST)
		).toEqual([]);
	});

	it('leaves alone the records that already stand where they would be put', () => {
		const a = record('a', { ...spot, position: 1 });
		const moved = record('b');
		const c = record('c');

		expect(
			placementsLeftBehind([a, moved, c], 3, [moved], spot, FURTHEST)
		).toEqual([{ releaseId: 'c', placement: { ...spot, position: 2 } }]);
	});

	it('empties out with the last record taken from it', () => {
		const moved = record('a');

		expect(
			placementsLeftBehind([moved], 1, [moved], spot, FURTHEST)
		).toEqual([]);
	});

	it('leaves a gap the size of everything taken out at once', () => {
		const a = record('a');
		const b = record('b');
		const c = record('c');

		/* Three stood here, two were carried off: the one left standing
		   keeps the place it had rather than sliding to the front. */
		expect(
			placementsLeftBehind([a, b, c], 3, [a, b], spot, FURTHEST)
		).toEqual([{ releaseId: 'c', placement: { ...spot, position: 1 } }]);
	});

	it('keeps the far wall where it is when the left run loses a record', () => {
		const moved = record('b');
		const shown = [record('a'), moved, record('far')];

		/* Two runs: a and b on the left, far on the right. Taking b out
		   hands the left run its places and leaves far against the wall. */
		expect(placementsLeftBehind(shown, 2, [moved], spot, FURTHEST)).toEqual(
			[
				{ releaseId: 'a', placement: { ...spot, position: 1 } },
				{
					releaseId: 'far',
					placement: { ...spot, side: 'right', position: 1 },
				},
			]
		);
	});
});
