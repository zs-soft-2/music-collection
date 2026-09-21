import {
	SHELF_LAYOUT_SETTING,
	SHELF_LIMITS,
	clampShelfSide,
	shelfCapacity,
} from './shelf-layout.setting';

describe('SHELF_LAYOUT_SETTING', () => {
	it('draws no furniture without a document', () => {
		expect(SHELF_LAYOUT_SETTING.toValue({})).toEqual({ units: [] });
	});

	it('reads the units the collector drew', () => {
		expect(
			SHELF_LAYOUT_SETTING.toValue({
				units: [
					{ id: 'a', name: 'Living room', rows: 4, columns: 2 },
					{ id: 'b', name: '', rows: 2, columns: 4 },
				],
			})
		).toEqual({
			units: [
				{ id: 'a', name: 'Living room', rows: 4, columns: 2 },
				{ id: 'b', name: '', rows: 2, columns: 4 },
			],
		});
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
			})
		).toEqual({
			units: [{ id: 'c', name: '', rows: 3, columns: 3 }],
		});
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
		const units = [{ id: 'a', name: 'Hall', rows: 5, columns: 1 }];

		expect(SHELF_LAYOUT_SETTING.toDocument({ units })).toEqual({ units });
	});
});

describe('clampShelfSide', () => {
	it('keeps a side inside what a shelf can be', () => {
		expect(clampShelfSide(0)).toBe(SHELF_LIMITS.minSide);
		expect(clampShelfSide(99)).toBe(SHELF_LIMITS.maxSide);
		expect(clampShelfSide(3.4)).toBe(3);
	});
});

describe('shelfCapacity', () => {
	it('counts the compartments and what they hold', () => {
		expect(
			shelfCapacity(
				[
					{ id: 'a', name: '', rows: 4, columns: 2 },
					{ id: 'b', name: '', rows: 2, columns: 4 },
				],
				36
			)
		).toEqual({ compartments: 16, records: 576 });
	});
});
