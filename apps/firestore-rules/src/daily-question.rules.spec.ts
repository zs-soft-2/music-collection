import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const DAY = '2026-09-24';

/** The question as the composing function writes it: without the answer. */
const question = {
	uid: DAY,
	day: DAY,
	entityType: 'Daily Question',
	templateKey: 'openingTrack',
	difficulty: 'medium',
	params: { album: 'Master of Puppets', artist: 'Metallica' },
	options: [
		{ id: 'track-1', label: 'Battery' },
		{ id: 'track-2', label: 'Master of Puppets' },
		{ id: 'track-3', label: 'The Thing That Should Not Be' },
		{ id: 'track-4', label: 'Welcome Home (Sanitarium)' },
	],
};

/** The answer, which lives where nobody can read it. */
const answer = {
	day: DAY,
	answerId: 'track-1',
	templateKey: 'openingTrack',
	subject: { kind: 'album', uid: 'album-motp', name: 'Master of Puppets' },
};

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

const questionOf = (database: ReturnType<typeof asMe>) =>
	doc(database, 'daily-question', DAY);
const answerOf = (database: ReturnType<typeof asMe>) =>
	doc(database, 'daily-question', DAY, 'secret', 'answer');

/** Puts today's question up the way the function does, past the rules. */
const composed = () =>
	testEnv.withSecurityRulesDisabled(async (context) => {
		const database = context.firestore() as never;

		await setDoc(questionOf(database), question);
		await setDoc(answerOf(database), answer);
	});

describe('daily question: the collector', () => {
	it('reads the question of the day', async () => {
		await composed();

		await assertSucceeds(getDoc(questionOf(asMe())));
	});

	it('does not read the answer', async () => {
		await composed();

		await assertFails(getDoc(answerOf(asMe())));
	});

	it('does not write the question', () =>
		assertFails(setDoc(questionOf(asMe()), question)));

	it('does not write the answer', () =>
		assertFails(setDoc(answerOf(asMe()), answer)));
});

describe('daily question: a visitor', () => {
	it('does not read the question', async () => {
		await composed();

		await assertFails(getDoc(questionOf(asVisitor())));
	});

	it('does not read the answer', async () => {
		await composed();

		await assertFails(getDoc(answerOf(asVisitor())));
	});

	it('does not write the question', () =>
		assertFails(setDoc(questionOf(asVisitor()), question)));
});

/** The graded guess, as `answerDailyQuestion` writes it. */
const guess = {
	day: DAY,
	optionId: 'track-2',
	answerId: 'track-1',
	correct: false,
	templateKey: 'openingTrack',
	difficulty: 'medium',
	subject: { kind: 'album', uid: 'album-motp', name: 'Master of Puppets' },
	points: 0,
	streak: 0,
	answeredAt: 1774000000000,
};

/** The game's own pot, which the same callable keeps. */
const pot = {
	points: 120,
	streak: 3,
	longestStreak: 7,
	answered: 12,
	correct: 9,
	lastDay: DAY,
};

const OTHER = 'collector-2';

const asOther = () => testEnv.authenticatedContext(OTHER).firestore();

const guessOf = (database: ReturnType<typeof asMe>, uid = ME) =>
	doc(database, 'user', uid, 'daily-answer', DAY);
const potOf = (database: ReturnType<typeof asMe>, uid = ME) =>
	doc(database, 'user', uid, 'game', 'daily-question');

/** Grades the guess the way the callable does, past the rules. */
const graded = () =>
	testEnv.withSecurityRulesDisabled(async (context) => {
		const database = context.firestore() as never;

		await setDoc(guessOf(database), guess);
		await setDoc(potOf(database), pot);
	});

describe('daily answer', () => {
	it('is read by the collector it belongs to', async () => {
		await graded();

		await assertSucceeds(getDoc(guessOf(asMe())));
	});

	it('is not read by anybody else', async () => {
		await graded();

		await assertFails(getDoc(guessOf(asOther(), ME)));
	});

	// A guess the client could write is a guess it could correct, and points
	// it could award itself.
	it('is not written by the collector', () =>
		assertFails(setDoc(guessOf(asMe()), guess)));
});

describe('the game pot', () => {
	it('is read by its owner', async () => {
		await graded();

		await assertSucceeds(getDoc(potOf(asMe())));
	});

	it('is not read by anybody else', async () => {
		await graded();

		await assertFails(getDoc(potOf(asOther(), ME)));
	});

	it('is not written by the collector', () =>
		assertFails(setDoc(potOf(asMe()), pot)));
});
