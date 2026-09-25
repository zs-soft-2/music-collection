import { DailyQuestionAnswer } from './daily-question';
import {
	DailyQuestionScoreDocument,
	EMPTY_SCORE,
	MAX_STREAK_BONUS_DAYS,
	POINTS,
	STREAK_BONUS_PER_DAY,
	gradeAnswer,
	pointsFor,
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
		expect(pointsFor('hard', 0, false)).toBe(0);
	});

	it('a sorozat első napja csak az alappontot fizeti', () => {
		expect(pointsFor('easy', 1, true)).toBe(POINTS.easy);
	});

	it('a nehezebb kérdés többet fizet', () => {
		expect(pointsFor('hard', 1, true)).toBeGreaterThan(
			pointsFor('easy', 1, true)
		);
	});

	it('a sorozat naponta bónuszol', () => {
		expect(pointsFor('medium', 3, true)).toBe(
			POINTS.medium + 2 * STREAK_BONUS_PER_DAY
		);
	});

	it('a bónusz egy ponton nem nő tovább', () => {
		expect(pointsFor('medium', 40, true)).toBe(
			POINTS.medium + MAX_STREAK_BONUS_DAYS * STREAK_BONUS_PER_DAY
		);
	});
});

describe('gradeAnswer', () => {
	const grade = (
		optionId: string,
		current: DailyQuestionScoreDocument = score()
	) =>
		gradeAnswer({
			day: DAY,
			optionId,
			difficulty: 'medium',
			answer,
			score: current,
			answeredAt: 1774000000000,
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
