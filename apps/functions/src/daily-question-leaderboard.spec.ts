import { rankStandings } from './daily-question-leaderboard';

const standing = (
	uid: string,
	points: number,
	overrides: { longestStreak?: number; correct?: number } = {}
) => ({
	uid,
	points,
	longestStreak: overrides.longestStreak ?? 0,
	correct: overrides.correct ?? 0,
});

describe('rankStandings', () => {
	it('pont szerint csökkenően rangsorol', () => {
		const ranked = rankStandings([
			standing('a', 10),
			standing('b', 30),
			standing('c', 20),
		]);

		expect(ranked.map((row) => row.uid)).toEqual(['b', 'c', 'a']);
		expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3]);
	});

	it('az azonos pontszám azonos helyezés, és a következő ennyivel lejjebb', () => {
		const ranked = rankStandings([
			standing('a', 30),
			standing('b', 30),
			standing('c', 10),
		]);

		expect(ranked.map((row) => row.rank)).toEqual([1, 1, 3]);
	});

	it('döntetlennél a hosszabb sorozat áll előrébb', () => {
		const ranked = rankStandings([
			standing('a', 30, { longestStreak: 2 }),
			standing('b', 30, { longestStreak: 9 }),
		]);

		expect(ranked[0].uid).toBe('b');
		// A sorrend kérdése eldőlt, a helyezés viszont közös marad.
		expect(ranked.map((row) => row.rank)).toEqual([1, 1]);
	});

	it('teljes döntetlennél is kiszámítható a sorrend', () => {
		const first = rankStandings([standing('b', 10), standing('a', 10)]);
		const second = rankStandings([standing('a', 10), standing('b', 10)]);

		expect(first.map((row) => row.uid)).toEqual(
			second.map((row) => row.uid)
		);
	});

	it('üres mezőnyből üres lista', () => {
		expect(rankStandings([])).toEqual([]);
	});
});
