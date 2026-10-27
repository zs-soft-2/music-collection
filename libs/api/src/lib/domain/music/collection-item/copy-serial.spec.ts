import {
	copySerialProblem,
	toCollectionItemSerial,
	toCopySerialClaimId,
} from './copy-serial';

describe('copySerialProblem', () => {
	it('is quiet about a record that carries no number', () => {
		expect(copySerialProblem('', '')).toBeNull();
	});

	it('takes a number without an edition size', () => {
		expect(copySerialProblem('123', '')).toBeNull();
	});

	it('takes a number within its edition', () => {
		expect(copySerialProblem('123', '500')).toBeNull();
	});

	it('takes the last copy of the edition', () => {
		expect(copySerialProblem('500', '500')).toBeNull();
	});

	it('refuses the 600th copy of an edition of 500', () => {
		expect(copySerialProblem('600', '500')).toBe('tooLarge');
	});

	it('refuses a copy counted from zero', () => {
		expect(copySerialProblem('0', '500')).toBe('number');
	});

	it('refuses a number that is not whole', () => {
		expect(copySerialProblem('12.5', '')).toBe('number');
	});

	it('refuses a number that is not a number', () => {
		expect(copySerialProblem('one of many', '')).toBe('number');
	});

	it('refuses an edition larger than any that was ever pressed', () => {
		expect(copySerialProblem('1', '1000001')).toBe('total');
	});

	/**
	 * Knowing 500 were made says nothing about which one is on the shelf, and
	 * which-one is the whole of what the registry is about.
	 */
	it('asks which one it is when only the edition size is given', () => {
		expect(copySerialProblem('', '500')).toBe('totalAlone');
	});

	it('reads the copy number first when both are wrong', () => {
		expect(copySerialProblem('nope', 'also nope')).toBe('number');
	});
});

describe('toCollectionItemSerial', () => {
	it('keeps the number and the edition size', () => {
		expect(toCollectionItemSerial('123', '500')).toEqual({
			number: 123,
			total: 500,
		});
	});

	it('keeps a number whose edition size was never printed', () => {
		expect(toCollectionItemSerial('123', '')).toEqual({
			number: 123,
			total: null,
		});
	});

	it('keeps nothing where no number was given', () => {
		expect(toCollectionItemSerial('', '500')).toBeNull();
	});

	it('reads around the spaces a number was typed in', () => {
		expect(toCollectionItemSerial(' 123 ', ' 500 ')).toEqual({
			number: 123,
			total: 500,
		});
	});
});

describe('toCopySerialClaimId', () => {
	it('spells the pressing and the number as one key', () => {
		expect(toCopySerialClaimId('r1', 123)).toBe('r1_123');
	});

	/**
	 * A release id may itself end in an underscore and digits. The pair still
	 * cannot be spelled two ways, because the number is a whole number and
	 * holds no separator to move the split.
	 */
	it('tells two pressings apart that share a prefix', () => {
		expect(toCopySerialClaimId('a_1', 23)).not.toBe(
			toCopySerialClaimId('a', 123)
		);
	});
});
