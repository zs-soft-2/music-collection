import {
	DEFAULT_CUBBY,
	SHELF_MEDIA_SIZES,
	cubbyHolds,
	shelfCopySize,
	shelfMediaSize,
} from './shelf-layout';

/*
 * The collector's own tape measure. The same number has to draw the spine
 * and decide how many copies a compartment holds — these say it does.
 */
describe('shelfMediaSize', () => {
	it('measures a medium at the standard size', () => {
		expect(shelfMediaSize('cd').thickness).toBe(
			SHELF_MEDIA_SIZES.cd.thickness
		);
	});

	it('measures it at the width the collector set', () => {
		expect(shelfMediaSize('cd', { cd: 7 }).thickness).toBe(7);
	});

	it('leaves the height alone: a case is as tall as it is', () => {
		expect(shelfMediaSize('cd', { cd: 7 }).height).toBe(
			SHELF_MEDIA_SIZES.cd.height
		);
	});

	it('ignores a width that is not one', () => {
		expect(shelfMediaSize('cd', { cd: 0 }).thickness).toBe(
			SHELF_MEDIA_SIZES.cd.thickness
		);
	});
});

describe('shelfCopySize', () => {
	it('measures a box of CDs as a CD-high slab', () => {
		const box = shelfCopySize('cd', { boxSet: true });

		expect(box).toEqual(SHELF_MEDIA_SIZES.cdbox);
		expect(box.height).toBe(SHELF_MEDIA_SIZES.cd.height);
	});

	it('measures every other box at an LP’s height', () => {
		expect(shelfCopySize('vinyl', { boxSet: true })).toEqual(
			SHELF_MEDIA_SIZES.boxset
		);
	});

	it('takes the collector’s width for either kind of box', () => {
		expect(
			shelfCopySize('cd', { boxSet: true }, { cdbox: 40 }).thickness
		).toBe(40);
		expect(
			shelfCopySize('vinyl', { boxSet: true }, { boxset: 50 }).thickness
		).toBe(50);
	});

	it('adds the packaging to a width the collector set', () => {
		/* 7 mm of record in a gatefold jacket, which is 4 mm more. */
		expect(
			shelfCopySize('vinyl', { gatefold: true }, { vinyl: 7 }).thickness
		).toBe(11);
	});
});

describe('cubbyHolds', () => {
	it('counts what the collector’s own width lets in', () => {
		/* A 33 cm cubby takes 33 standard CDs, and 41 slim ones. */
		expect(cubbyHolds(DEFAULT_CUBBY, 'cd')).toBe(33);
		expect(cubbyHolds(DEFAULT_CUBBY, 'cd', { cd: 8 })).toBe(41);
	});

	it('still turns away what is too tall for the compartment', () => {
		const rack = { ...DEFAULT_CUBBY, height: 3 };

		expect(cubbyHolds(rack, 'vinyl', { vinyl: 1 })).toBe(0);
	});
});
