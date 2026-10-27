import { DailyQuestionAnswer, QuestionScoring } from './daily-question';
import {
	DailyQuestionScoreDocument,
	EMPTY_SCORE,
	LATE_GRACE_SEC,
	MAX_STREAK_BONUS_DAYS,
	POINTS,
	STREAK_BONUS_PER_DAY,
	clampElapsed,
	gradeAnswer,
	pointsFor,
	scoringOf,
	speedBonusFor,
	streakAfter,
} from './daily-answer';

const DAY = '2026-09-24';

const answer: DailyQuestionAnswer = {
	day: DAY,
	answerId: 'track-1',
	templateKey: 'openingTrack',
	subject: { kind: 'album', uid: 'album-motp', name: 'Master of Puppets' },
};

const score = (
	overrides: Partial<DailyQuestionScoreDocument> = {}
): DailyQuestionScoreDocument => ({ ...EMPTY_SCORE, ...overrides });

/** A nap pontozása, ahogy a kérdésen áll. */
const scoring = (
	overrides: Partial<QuestionScoring> = {}
): QuestionScoring => ({
	base: POINTS.medium,
	streakBonusPerDay: STREAK_BONUS_PER_DAY,
	maxStreakBonusDays: MAX_STREAK_BONUS_DAYS,
	speedBonusMax: 0,
	multiplier: 1,
	...overrides,
});

/** Csak a pontszám; a felbontást a maga helyén nézzük. */
const points = (
	current: QuestionScoring,
	streak: number,
	correct: boolean,
	speedBonus = 0
) => pointsFor(current, streak, correct, speedBonus).points;

describe('streakAfter', () => {
	it('a tegnapi nap után folytatja a sorozatot', () => {
		expect(
			streakAfter(score({ streak: 3, lastDay: '2026-09-23' }), DAY, true)
		).toBe(4);
	});

	it('a kihagyott nap után újrakezdi', () => {
		expect(
			streakAfter(score({ streak: 3, lastDay: '2026-09-21' }), DAY, true)
		).toBe(1);
	});

	it('az első jó tipp egynapos sorozat', () => {
		expect(streakAfter(score(), DAY, true)).toBe(1);
	});

	it('a rossz tipp nullázza', () => {
		expect(
			streakAfter(score({ streak: 9, lastDay: '2026-09-23' }), DAY, false)
		).toBe(0);
	});
});

describe('pointsFor', () => {
	it('a rossz tipp nem fizet', () => {
		expect(points(scoring({ base: POINTS.hard }), 0, false)).toBe(0);
	});

	it('a sorozat első napja csak az alappontot fizeti', () => {
		expect(points(scoring({ base: POINTS.easy }), 1, true)).toBe(
			POINTS.easy
		);
	});

	it('a nehezebb kérdés többet fizet', () => {
		expect(points(scoring({ base: POINTS.hard }), 1, true)).toBeGreaterThan(
			points(scoring({ base: POINTS.easy }), 1, true)
		);
	});

	it('a sorozat naponta bónuszol', () => {
		expect(points(scoring(), 3, true)).toBe(
			POINTS.medium + 2 * STREAK_BONUS_PER_DAY
		);
	});

	it('a bónusz egy ponton nem nő tovább', () => {
		expect(points(scoring(), 40, true)).toBe(
			POINTS.medium + MAX_STREAK_BONUS_DAYS * STREAK_BONUS_PER_DAY
		);
	});

	it('a gyorsasági bónusz hozzáadódik', () => {
		expect(points(scoring({ speedBonusMax: 10 }), 1, true, 7)).toBe(
			POINTS.medium + 7
		);
	});

	it('a bónusz nap szorzója az egészre vonatkozik', () => {
		expect(points(scoring({ multiplier: 2 }), 3, true, 5)).toBe(
			2 * (POINTS.medium + 2 * STREAK_BONUS_PER_DAY + 5)
		);
	});

	it('a felbontás elszámol a pontról', () => {
		const { points: total, breakdown } = pointsFor(
			scoring({ multiplier: 2 }),
			3,
			true,
			5
		);

		expect(breakdown).toEqual({
			base: POINTS.medium,
			streakBonus: 2 * STREAK_BONUS_PER_DAY,
			speedBonus: 5,
			multiplier: 2,
		});
		expect(total).toBe(
			(breakdown.base + breakdown.streakBonus + breakdown.speedBonus) *
				breakdown.multiplier
		);
	});

	it('a rossz tipp felbontása is nulla, a szorzótól függetlenül', () => {
		expect(pointsFor(scoring({ multiplier: 3 }), 0, false, 9)).toEqual({
			points: 0,
			breakdown: {
				base: 0,
				streakBonus: 0,
				speedBonus: 0,
				multiplier: 3,
			},
		});
	});
});

describe('scoringOf', () => {
	it('a kérdés pontozását használja, ha van rajta', () => {
		expect(scoringOf('easy', { base: 42, multiplier: 2 })).toMatchObject({
			base: 42,
			multiplier: 2,
		});
	});

	it('a régi, pontozás nélküli kérdést a kódba írt értékekkel számolja', () => {
		expect(scoringOf('hard', undefined)).toEqual({
			base: POINTS.hard,
			streakBonusPerDay: STREAK_BONUS_PER_DAY,
			maxStreakBonusDays: MAX_STREAK_BONUS_DAYS,
			speedBonusMax: 0,
			multiplier: 1,
		});
	});
});

describe('clampElapsed', () => {
	it('óra nélkül nincs mért idő', () => {
		expect(clampElapsed(30, 0)).toBe(0);
	});

	it('a hiányzó időt a teljes korlátnak veszi', () => {
		expect(clampElapsed(undefined, 60)).toBe(60);
		expect(clampElapsed('gyors', 60)).toBe(60);
		expect(clampElapsed(Number.NaN, 60)).toBe(60);
	});

	it('a negatív időt nullára húzza', () => {
		expect(clampElapsed(-10, 60)).toBe(0);
	});

	it('a képtelenül nagy időt is megfogja', () => {
		expect(clampElapsed(100000, 60)).toBe(120);
	});
});

describe('speedBonusFor', () => {
	it('az azonnali tipp a teljes bónuszt viszi', () => {
		expect(speedBonusFor(scoring({ speedBonusMax: 10 }), 0, 60)).toBe(10);
	});

	it('a felezőidőnél a fele jár', () => {
		expect(speedBonusFor(scoring({ speedBonusMax: 10 }), 30, 60)).toBe(5);
	});

	it('az utolsó pillanatban semmi', () => {
		expect(speedBonusFor(scoring({ speedBonusMax: 10 }), 60, 60)).toBe(0);
	});

	it('óra nélkül nem fizet', () => {
		expect(speedBonusFor(scoring({ speedBonusMax: 10 }), 0, 0)).toBe(0);
	});
});

describe('gradeAnswer', () => {
	const grade = (
		optionId: string,
		current: DailyQuestionScoreDocument = score(),
		clock: { timeLimitSec?: number; elapsedSec?: number } = {}
	) =>
		gradeAnswer({
			day: DAY,
			optionId,
			difficulty: 'medium',
			answer,
			score: current,
			answeredAt: 1774000000000,
			...clock,
		});

	it('a jó tippet elfogadja, és a megfejtést is elteszi', () => {
		const graded = grade('track-1');

		expect(graded.answer).toMatchObject({
			correct: true,
			answerId: 'track-1',
			optionId: 'track-1',
			points: POINTS.medium,
			streak: 1,
			subject: answer.subject,
		});
	});

	it('a rossz tipphez is odaírja a helyes választ', () => {
		const graded = grade('track-2');

		expect(graded.answer).toMatchObject({
			correct: false,
			answerId: 'track-1',
			optionId: 'track-2',
			points: 0,
			streak: 0,
		});
	});

	it('a kasszába beleszámolja a pontot és a napot', () => {
		const graded = grade(
			'track-1',
			score({
				points: 100,
				streak: 2,
				longestStreak: 5,
				answered: 10,
				correct: 8,
				lastDay: '2026-09-23',
			})
		);

		expect(graded.score).toEqual({
			points: 100 + POINTS.medium + 2 * STREAK_BONUS_PER_DAY,
			streak: 3,
			longestStreak: 5,
			answered: 11,
			correct: 9,
			lastDay: DAY,
		});
	});

	it('a rossz tipp is nap: a próbálkozás számol, a sorozat nem', () => {
		const graded = grade(
			'track-2',
			score({
				points: 40,
				streak: 4,
				longestStreak: 4,
				answered: 4,
				correct: 4,
				lastDay: '2026-09-23',
			})
		);

		expect(graded.score).toEqual({
			points: 40,
			streak: 0,
			longestStreak: 4,
			answered: 5,
			correct: 4,
			lastDay: DAY,
		});
	});

	it('a leghosszabb sorozatot megőrzi', () => {
		const graded = grade(
			'track-1',
			score({ streak: 6, longestStreak: 6, lastDay: '2026-09-23' })
		);

		expect(graded.score.longestStreak).toBe(7);
	});
});

describe('gradeAnswer az órával', () => {
	const grade = (
		optionId: string,
		clock: { timeLimitSec?: number; elapsedSec?: number },
		current: DailyQuestionScoreDocument = score()
	) =>
		gradeAnswer({
			day: DAY,
			optionId,
			difficulty: 'medium',
			answer,
			score: current,
			answeredAt: 1774000000000,
			scoring: { base: 20, speedBonusMax: 10, multiplier: 1 },
			...clock,
		});

	it('a gyors jó tipp bónuszt fizet', () => {
		expect(
			grade('track-1', { timeLimitSec: 60, elapsedSec: 6 }).answer.points
		).toBe(20 + 9);
	});

	it('a lejárt idő nem fizet, és a sorozatot is elvágja', () => {
		const graded = grade(
			'track-1',
			{ timeLimitSec: 60, elapsedSec: 90 },
			score({ streak: 4, lastDay: '2026-09-23' })
		);

		expect(graded.answer).toMatchObject({
			correct: true,
			timedOut: true,
			points: 0,
			streak: 0,
		});
		expect(graded.score.correct).toBe(0);
	});

	it('a türelmi másodperceken belül még számít', () => {
		const graded = grade('track-1', {
			timeLimitSec: 60,
			elapsedSec: 60 + LATE_GRACE_SEC,
		});

		expect(graded.answer.timedOut).toBe(false);
		expect(graded.answer.points).toBeGreaterThan(0);
	});

	it('óra nélkül nincs lejárat és nincs gyorsasági bónusz', () => {
		const graded = grade('track-1', { timeLimitSec: 0, elapsedSec: 9999 });

		expect(graded.answer).toMatchObject({
			timedOut: false,
			elapsedSec: 0,
			points: 20,
		});
	});

	it('idő nélkül beküldött tipp a leglassabbnak számít', () => {
		const graded = grade('track-1', { timeLimitSec: 60 });

		expect(graded.answer.elapsedSec).toBe(60);
		expect(graded.answer.breakdown.speedBonus).toBe(0);
		expect(graded.answer.timedOut).toBe(false);
	});
});
