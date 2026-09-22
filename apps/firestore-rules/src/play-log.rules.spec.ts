import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	deleteDoc,
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const SOMEONE_ELSE = 'collector-2';

/** One sitting, as the player writes it. */
const sitting = (albumId = 'album-1') => ({
	uid: `${albumId}-1000`,
	albumId,
	albumTitle: 'Selling England by the Pound',
	artistName: 'Genesis',
	source: 'spotify',
	startedAt: 1000,
	endedAt: 4000,
	playedMs: 3000,
	playedTracks: 8,
	trackCount: 8,
	completed: true,
	updatedAt: serverTimestamp(),
});

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asStranger = () => testEnv.authenticatedContext(SOMEONE_ELSE).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

const entry = (database: ReturnType<typeof asMe>, uid = ME) =>
	doc(database, 'user', uid, 'play-log', 'album-1-1000');

/** Puts a sitting in the log without asking the rules. */
const logged = () =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(entry(context.firestore() as never), sitting())
	);

describe('play-log: the collector', () => {
	it('keeps a sitting of their own', () =>
		assertSucceeds(setDoc(entry(asMe()), sitting())));

	it('reads their own log back', async () => {
		await logged();

		await assertSucceeds(getDoc(entry(asMe())));
	});

	it('forgets a sitting of their own', async () => {
		await logged();

		await assertSucceeds(deleteDoc(entry(asMe())));
	});
});

describe('play-log: everybody else', () => {
	it('is not written by a stranger', () =>
		assertFails(setDoc(entry(asStranger(), ME), sitting())));

	it('is not read by a stranger', async () => {
		await logged();

		await assertFails(getDoc(entry(asStranger(), ME)));
	});

	it('is not read by a visitor', async () => {
		await logged();

		await assertFails(getDoc(entry(asVisitor(), ME)));
	});

	it('is not written by a visitor', () =>
		assertFails(setDoc(entry(asVisitor(), ME), sitting())));
});
