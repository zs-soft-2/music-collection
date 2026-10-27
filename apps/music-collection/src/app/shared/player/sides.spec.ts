import { sideBreaks, trackSide } from './sides';

describe('trackSide', () => {
	it('reads the side off a vinyl position', () => {
		expect(trackSide('A1')).toEqual({ key: 'A', label: 'Side A' });
		expect(trackSide('b3')).toEqual({ key: 'B', label: 'Side B' });
		expect(trackSide('D')).toEqual({ key: 'D', label: 'Side D' });
	});

	it('keeps the disc apart on a boxed set', () => {
		expect(trackSide('2-B1')).toEqual({
			key: '2-B',
			label: 'Disc 2 · Side B',
		});
	});

	it('reads a doubled side letter', () => {
		expect(trackSide('AA2')).toEqual({ key: 'AA', label: 'Side AA' });
	});

	it('finds no side where the positions are numbers', () => {
		expect(trackSide('3')).toBeNull();
		expect(trackSide('2-04')).toBeNull();
		expect(trackSide('CD1-1')).toBeNull();
		expect(trackSide('')).toBeNull();
		expect(trackSide(null)).toBeNull();
	});
});

describe('sideBreaks', () => {
	const track = (id: string, position: string | null) => ({ id, position });

	it('marks the first track of every side but the first', () => {
		const breaks = sideBreaks([
			track('1', 'A1'),
			track('2', 'A2'),
			track('3', 'B1'),
			track('4', 'B2'),
			track('5', 'C1'),
		]);

		expect([...breaks.keys()]).toEqual(['3', '5']);
		expect(breaks.get('3')?.label).toBe('Side B');
	});

	it('leaves a release without sides alone', () => {
		expect(
			sideBreaks([track('1', '1'), track('2', '2'), track('3', null)])
				.size
		).toBe(0);
	});

	it('does not turn a one-sided release over', () => {
		expect(sideBreaks([track('1', 'A1'), track('2', 'A2')]).size).toBe(0);
	});

	it('ignores a gap in the positions rather than starting a side', () => {
		const breaks = sideBreaks([
			track('1', 'A1'),
			track('2', null),
			track('3', 'A2'),
			track('4', 'B1'),
		]);

		expect([...breaks.keys()]).toEqual(['4']);
	});
});
