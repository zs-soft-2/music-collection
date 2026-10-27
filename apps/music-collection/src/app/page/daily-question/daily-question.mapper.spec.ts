import {
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionLeaderboard,
	DailyQuestionScore,
	EMPTY_DAILY_QUESTION_SCORE,
	EntityTypeEnum,
} from '@music-collection/api';

import { EMPTY_DAILY_QUESTION_LEADERBOARD } from '../../data/daily-question';

import {
	toAccuracy,
	toFrame,
	toHistoryRows,
	toLeaderboardView,
	toOptions,
	toSubjectLink,
	toView,
} from './daily-question.mapper';

const DAY = '2026-09-24';

const question = (
	overrides: Partial<DailyQuestionEntity> = {}
): DailyQuestionEntity => ({
	uid: DAY,
	day: DAY,
	entityType: EntityTypeEnum.DailyQuestion,
	templateKey: 'openingTrack',
	difficulty: 'medium',
	params: { album: 'Master of Puppets', artist: 'Metallica' },
	options: [
		{ id: 'track-1', label: 'Battery' },
		{ id: 'track-2', label: 'Master of Puppets' },
		{ id: 'track-3', label: 'The Thing That Should Not Be' },
		{ id: 'track-4', label: 'Welcome Home (Sanitarium)' },
	],
	...overrides,
});

const answer = (overrides: Partial<DailyAnswer> = {}): DailyAnswer => ({
	day: DAY,
	optionId: 'track-1',
	answerId: 'track-1',
	correct: true,
	templateKey: 'openingTrack',
	difficulty: 'medium',
	subject: { kind: 'album', uid: 'album-motp', name: 'Master of Puppets' },
	points: 20,
	streak: 1,
	answeredAt: 1774000000000,
	...overrides,
});

describe('toFrame', () => {
	it('a keret mellé a katalógusértékeket is odaadja', () => {
		expect(toFrame(question())).toEqual({
			key: 'dailyQuestion.template.openingTrack',
			params: {
				album: 'Master of Puppets',
				artist: 'Metallica',
				edition: '',
			},
		});
	});
});

describe('toOptions', () => {
	it('tipp előtt csak a kiválasztott opciót jelöli', () => {
		const options = toOptions(question(), null, 'track-3');

		expect(options.filter((option) => option.picked)).toHaveLength(1);
		expect(options.every((option) => !option.correct)).toBe(true);
		expect(options.every((option) => !option.missed)).toBe(true);
	});

	it('a jó tipp után a helyes válasz látszik', () => {
		const options = toOptions(question(), answer(), null);

		expect(options.find((option) => option.correct)?.id).toBe('track-1');
		expect(options.every((option) => !option.missed)).toBe(true);
	});

	it('a rossz tipp után a választott és a helyes is látszik', () => {
		const options = toOptions(
			question(),
			answer({ optionId: 'track-2', correct: false }),
			null
		);

		expect(options.find((option) => option.missed)?.id).toBe('track-2');
		expect(options.find((option) => option.correct)?.id).toBe('track-1');
	});
});

describe('toSubjectLink', () => {
	it('albumra, előadóra, kiadásra mutat', () => {
		expect(
			toSubjectLink({ kind: 'album', uid: 'a-1', name: 'Kill Em All' })
		).toEqual(['/album', 'a-1']);
		expect(
			toSubjectLink({ kind: 'artist', uid: 'r-1', name: 'Metallica' })
		).toEqual(['/artist', 'r-1']);
		expect(
			toSubjectLink({ kind: 'release', uid: 'p-1', name: 'US pressing' })
		).toEqual(['/release', 'p-1']);
	});

	// A track lapja az albumot is kéri az útvonalban, a subject nem hozza.
	it('számra és semmire nem ad linket', () => {
		expect(
			toSubjectLink({ kind: 'track', uid: 't-1', name: 'Battery' })
		).toBeNull();
		expect(toSubjectLink(null)).toBeNull();
	});
});

describe('toView', () => {
	it('a nap óráját és szorzóját átveszi a kérdésről', () => {
		const view = toView(
			question({
				timeLimitSec: 45,
				scoring: {
					base: 20,
					streakBonusPerDay: 2,
					maxStreakBonusDays: 5,
					speedBonusMax: 10,
					multiplier: 2,
				},
				imageUrl: 'https://example.invalid/cover.jpg',
			}),
			null,
			null
		);

		expect(view).toMatchObject({
			timeLimitSec: 45,
			multiplier: 2,
			imageUrl: 'https://example.invalid/cover.jpg',
		});
	});

	// A játék első napjainak kérdésein még nincs se óra, se pontozás.
	it('a régi kérdést óra és szorzó nélkül mutatja', () => {
		expect(toView(question(), null, null)).toMatchObject({
			timeLimitSec: 0,
			multiplier: 1,
			imageUrl: null,
		});
	});
});

describe('toAccuracy', () => {
	it('kerekített százalék', () => {
		expect(toAccuracy(2, 3)).toBe(67);
	});

	it('tipp nélkül nulla, nem osztás nullával', () => {
		expect(toAccuracy(0, 0)).toBe(0);
	});
});

describe('toLeaderboardView', () => {
	const row = (
		uid: string,
		rank: number,
		points: number,
		name = uid
	): DailyQuestionLeaderboard['rows'][number] => ({
		rank,
		uid,
		name,
		points,
		streak: 1,
		longestStreak: 3,
		answered: 10,
		correct: 5,
	});

	const board = (
		rows: DailyQuestionLeaderboard['rows']
	): DailyQuestionLeaderboard => ({
		rows,
		players: rows.length,
		updatedAt: 1774000000000,
	});

	const score = (
		overrides: Partial<DailyQuestionScore> = {}
	): DailyQuestionScore => ({
		...EMPTY_DAILY_QUESTION_SCORE,
		...overrides,
	});

	it('üres mezőnyből és üres kasszából nincs táblázat', () => {
		expect(
			toLeaderboardView(EMPTY_DAILY_QUESTION_LEADERBOARD, score(), 'me')
				.rows
		).toEqual([]);
	});

	it('megjelöli a saját sort', () => {
		const view = toLeaderboardView(
			board([row('other', 1, 100), row('me', 2, 50)]),
			score({ answered: 10 }),
			'me'
		);

		expect(view.rows.map((item) => item.isMe)).toEqual([false, true]);
		// Aki benne van a listában, annak nem kell külön sor.
		expect(view.me).toBeNull();
	});

	it('a listán kívül állónak külön sort ad a kasszájából', () => {
		const view = toLeaderboardView(
			board([row('other', 1, 100)]),
			score({ answered: 8, correct: 4, points: 42, rank: 34 }),
			'me'
		);

		expect(view.me).toMatchObject({
			rank: 34,
			points: 42,
			accuracy: 50,
			isMe: true,
		});
	});

	it('helyezés nélkül is megmutatja a saját sort', () => {
		const view = toLeaderboardView(
			board([row('other', 1, 100)]),
			score({ answered: 1, points: 10 }),
			'me'
		);

		expect(view.me?.rank).toBe(0);
	});

	it('bejelentkezés nélkül senki nem „én” vagyok', () => {
		const view = toLeaderboardView(
			board([row('other', 1, 100)]),
			score(),
			null
		);

		expect(view.rows.every((item) => !item.isMe)).toBe(true);
		expect(view.me).toBeNull();
	});
});

describe('toHistoryRows', () => {
	const past = (day: string) => question({ day, uid: day });

	it('a mai napot kihagyja — az fent van a lapon', () => {
		const rows = toHistoryRows(
			[past('2026-09-25'), past('2026-09-24')],
			[],
			'2026-09-25'
		);

		expect(rows.map((row) => row.day)).toEqual(['2026-09-24']);
	});

	it('a tipp mellé a megfejtést is odaírja', () => {
		const rows = toHistoryRows(
			[past('2026-09-24')],
			[answer({ day: '2026-09-24' })],
			'2026-09-25'
		);

		expect(rows[0]).toMatchObject({
			played: true,
			correct: true,
			answerLabel: 'Battery',
			// Jó tippnél nincs mit szembeállítani vele.
			pickedLabel: '',
			points: 20,
		});
	});

	it('rossz tippnél azt is megmutatja, mire tippelt', () => {
		const rows = toHistoryRows(
			[past('2026-09-24')],
			[
				answer({
					day: '2026-09-24',
					optionId: 'track-3',
					correct: false,
					points: 0,
				}),
			],
			'2026-09-25'
		);

		expect(rows[0]).toMatchObject({
			correct: false,
			answerLabel: 'Battery',
			pickedLabel: 'The Thing That Should Not Be',
		});
	});

	/*
	 * A ki nem játszott nap megfejtését már nem lehet megtudni — a
	 * kiértékelés csak a mai tippet veszi el —, ezért a sor nem tesz úgy,
	 * mintha felfedne valamit.
	 */
	it('a kihagyott napról csak azt mondja, hogy kimaradt', () => {
		const rows = toHistoryRows([past('2026-09-24')], [], '2026-09-25');

		expect(rows[0]).toMatchObject({
			played: false,
			correct: false,
			answerLabel: '',
			pickedLabel: '',
			points: 0,
		});
	});

	it('a késve beküldött tippet megjelöli', () => {
		const rows = toHistoryRows(
			[past('2026-09-24')],
			[answer({ day: '2026-09-24', timedOut: true, points: 0 })],
			'2026-09-25'
		);

		expect(rows[0].late).toBe(true);
	});
});
