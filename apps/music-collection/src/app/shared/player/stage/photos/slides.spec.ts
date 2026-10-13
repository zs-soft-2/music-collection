import { slideAt, slideProgress } from './slides';

describe('slideAt', () => {
	it('has nothing to show without pictures', () => {
		expect(slideAt(0, 12, 7, 1)).toEqual({
			index: -1,
			next: -1,
			fade: 0,
			turn: 0,
		});
	});

	it('leaves a single picture up, never crossing to itself', () => {
		expect(slideAt(1, 48, 7, 1)).toEqual({
			index: 0,
			next: 0,
			fade: 0,
			turn: 0,
		});
	});

	it('moves on once a picture has had its turn', () => {
		expect(slideAt(3, 0, 7, 1).index).toBe(0);
		expect(slideAt(3, 6.9, 7, 1).index).toBe(0);
		expect(slideAt(3, 7, 7, 1).index).toBe(1);
		expect(slideAt(3, 14, 7, 1).index).toBe(2);
	});

	/*
	 * The pictures come round again; the turn does not, because it is what
	 * decides the crossing and a crossing repeating in step with the
	 * pictures would make the loop obvious.
	 */
	it('keeps counting turns past the last picture', () => {
		expect(slideAt(3, 21, 7, 1).turn).toBe(3);
		expect(slideAt(3, 70, 7, 1).turn).toBe(10);
	});

	it('comes back round to the first', () => {
		expect(slideAt(3, 21, 7, 1).index).toBe(0);
		expect(slideAt(3, 21, 7, 1).next).toBe(1);
	});

	it('crosses over the last second of a turn', () => {
		expect(slideAt(2, 6, 7, 1).fade).toBe(0);
		expect(slideAt(2, 6.5, 7, 1).fade).toBeCloseTo(0.5);
		expect(slideAt(2, 6.999, 7, 1).fade).toBeCloseTo(1, 2);
	});

	/** A track whose position arrives before the player has one. */
	it('starts at the first picture for a position it cannot use', () => {
		expect(slideAt(3, Number.NaN, 7, 1).index).toBe(0);
		expect(slideAt(3, -4, 7, 1).index).toBe(0);
	});
});

describe('slideProgress', () => {
	it('runs from the start of each turn to its end', () => {
		expect(slideProgress(0, 8)).toBe(0);
		expect(slideProgress(4, 8)).toBe(0.5);
		expect(slideProgress(8, 8)).toBe(0);
	});
});
