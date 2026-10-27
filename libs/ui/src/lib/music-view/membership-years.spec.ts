import { MembershipYears, isCurrentMember } from './membership-years';

const membership = (years: Partial<MembershipYears>): MembershipYears => ({
	kind: 'member',
	from: null,
	to: null,
	active: null,
	...years,
});

describe('isCurrentMember', () => {
	it('keeps a membership with a start and no end year running', () => {
		expect(isCurrentMember(membership({ from: 2012 }))).toBe(true);
	});

	it('ignores an inactive flag the empty end year contradicts', () => {
		expect(isCurrentMember(membership({ from: 2012, active: false }))).toBe(
			true
		);
	});

	it('ends a membership at its end year', () => {
		expect(
			isCurrentMember(membership({ from: 1979, to: 1981, active: false }))
		).toBe(false);
		expect(isCurrentMember(membership({ from: 2012, to: 2012 }))).toBe(
			false
		);
	});

	it('lets the flag keep an imported member current past their last album', () => {
		expect(
			isCurrentMember(membership({ from: 1975, to: 2015, active: true }))
		).toBe(true);
	});

	it('says nothing where no year and no flag does', () => {
		expect(isCurrentMember(membership({}))).toBe(false);
	});

	it('never turns a guest into a current member on the years alone', () => {
		expect(isCurrentMember(membership({ kind: 'guest', from: 2012 }))).toBe(
			false
		);
	});
});
