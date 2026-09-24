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
