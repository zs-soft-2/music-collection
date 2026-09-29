import {
	DEFAULT_CUBBY,
	SHELF_LAYOUT_SETTING,
	SHELF_LIMITS,
	ShelfCubby,
	ShelfUnitLayout,
	clampCubbyHeight,
	clampCubbyLength,
	clampShelfSide,
	shelfCapacity,
} from './shelf-layout.setting';

/** A compartment as the collector measured it. */
function cubby(height: number, length: number): ShelfCubby {
	return { height, length, stance: 'across' };
}

function unit(
	id: string,
	rows: number,
	columns: number,
	size: ShelfCubby = DEFAULT_CUBBY
): ShelfUnitLayout {
	return { id, name: '', rows, columns, cubby: size };
}

describe('SHELF_LAYOUT_SETTING', () => {
	it('draws no furniture without a document', () => {
		expect(SHELF_LAYOUT_SETTING.toValue({})).toEqual({ units: [] });
	});

	it('reads the units the collector drew', () => {
		expect(
			SHELF_LAYOUT_SETTING.toValue({
				units: [
					{
						id: 'a',
						name: 'Living room',
						rows: 4,
						columns: 2,
						cubby: { height: 3, length: 600, stance: 'down' },
					},
				],
			})
		).toEqual({
			units: [
				{
					id: 'a',
					name: 'Living room',
					rows: 4,
					columns: 2,
					cubby: { height: 3, length: 600, stance: 'down' },
				},
			],
		});
	});

	it('gives a unit drawn before compartments had a size a Kallax cubby', () => {
		expect(
			SHELF_LAYOUT_SETTING.toValue({
				units: [{ id: 'a', name: '', rows: 2, columns: 4 }],
			}).units[0].cubby
		).toEqual(DEFAULT_CUBBY);
	});

	it('drops a unit that is not a grid', () => {
		expect(
			SHELF_LAYOUT_SETTING.toValue({
				units: [
					{ id: 'a', rows: 0, columns: 4 },
					{ id: 'b', rows: 3, columns: 'wide' },
					null,
					{ id: 'c', rows: 3, columns: 3 },
				],
			}).units.map((drawn) => drawn.id)
		).toEqual(['c']);
	});

	it('names a unit the document left unnamed by its place', () => {
		expect(
			SHELF_LAYOUT_SETTING.toValue({ units: [{ rows: 1, columns: 1 }] })
				.units[0].id
		).toBe('shelf-1');
	});

	it('keeps no more units than a room may hold', () => {
		const units = Array.from({ length: SHELF_LIMITS.maxUnits + 4 }, () => ({
			rows: 2,
			columns: 2,
		}));

		expect(SHELF_LAYOUT_SETTING.toValue({ units }).units).toHaveLength(
			SHELF_LIMITS.maxUnits
		);
	});

	it('writes back what it read', () => {
		const units = [unit('a', 5, 1, cubby(5, 600))];

		expect(SHELF_LAYOUT_SETTING.toDocument({ units })).toEqual({
			units: [
				{
					id: 'a',
					name: '',
					rows: 5,
					columns: 1,
					cubby: { height: 5, length: 600, stance: 'across' },
				},
			],
		});
	});
});

describe('clampShelfSide', () => {
	it('keeps a side inside what a shelf can be', () => {
		expect(clampShelfSide(0)).toBe(SHELF_LIMITS.minSide);
		expect(clampShelfSide(99)).toBe(SHELF_LIMITS.maxSide);
		expect(clampShelfSide(3.4)).toBe(3);
	});
});

describe('clampCubbyHeight', () => {
	it('keeps a compartment inside what one can be', () => {
		expect(clampCubbyHeight(0)).toBe(SHELF_LIMITS.minHeight);
		expect(clampCubbyHeight(99)).toBe(SHELF_LIMITS.maxHeight);
		expect(clampCubbyHeight(Number.NaN)).toBe(DEFAULT_CUBBY.height);
	});
});

describe('clampCubbyLength', () => {
	it('snaps a length to the centimetre it was measured in', () => {
		expect(clampCubbyLength(334)).toBe(330);
		expect(clampCubbyLength(1)).toBe(SHELF_LIMITS.minLength);
		expect(clampCubbyLength(99999)).toBe(SHELF_LIMITS.maxLength);
		expect(clampCubbyLength(Number.NaN)).toBe(DEFAULT_CUBBY.length);
	});
});

describe('shelfCapacity', () => {
	it('measures a Kallax cubby by the records that go in it', () => {
		const room = shelfCapacity([unit('a', 1, 1)], { vinyl: 100 });

		/* 330 mm of shelf at 5 mm a sleeve. */
		expect(room).toMatchObject({
			compartments: 1,
			length: 330,
			holds: 66,
			short: 34,
		});
	});

	it('fits far more CDs than records in the same compartment', () => {
		expect(shelfCapacity([unit('a', 1, 1)], { cd: 100 }).holds).toBe(33);
		expect(shelfCapacity([unit('a', 1, 1)], { cassette: 100 }).holds).toBe(
			19
		);
	});

	it('leaves out what a compartment is too low for', () => {
		const rack = [unit('a', 1, 1, cubby(3, 330))];

		expect(shelfCapacity(rack, { vinyl: 10 })).toMatchObject({
			holds: 0,
			short: 10,
		});
		expect(shelfCapacity(rack, { cd: 10 }).holds).toBe(10);
	});

	it('spends the CD rack on CDs rather than on records a shelf would take', () => {
		const room = shelfCapacity(
			[unit('shelf', 1, 1), unit('rack', 1, 1, cubby(3, 330))],
			{ vinyl: 60, cd: 30 }
		);

		/* Both fit: the records on the shelf, the CDs in the rack. */
		expect(room).toMatchObject({ holds: 90, short: 0 });
		expect(room.filled).toEqual([60, 30]);
	});

	it('says which compartments the collection reaches', () => {
		expect(shelfCapacity([unit('a', 1, 3)], { vinyl: 70 }).filled).toEqual([
			66, 4, 0,
		]);
	});
});
