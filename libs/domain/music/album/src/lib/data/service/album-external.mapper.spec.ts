import { toDurationSec } from './album-external.mapper';

describe('toDurationSec', () => {
	it('reads a length as a sleeve prints it', () => {
		expect(toDurationSec('4:04')).toBe(244);
	});

	it('reads a side-long track', () => {
		expect(toDurationSec('1:02:30')).toBe(3750);
	});

	it('reads a length padded with spaces', () => {
		expect(toDurationSec('  3:09 ')).toBe(189);
	});

	it('has nothing to read when the length is unknown', () => {
		expect(toDurationSec(null)).toBeNull();
		expect(toDurationSec('')).toBeNull();
	});

	/*
	 * The field is typed by hand, so what arrives is whatever was typed. A
	 * length that cannot be read is left unknown rather than guessed at: a
	 * wrong number would quietly skew every total it is added into.
	 */
	it('leaves an unreadable length unknown', () => {
		expect(toDurationSec('four minutes')).toBeNull();
		expect(toDurationSec('244')).toBeNull();
		expect(toDurationSec('4:0:4:1')).toBeNull();
		expect(toDurationSec('4:-4')).toBeNull();
		expect(toDurationSec('4:4.5')).toBeNull();
	});
});
