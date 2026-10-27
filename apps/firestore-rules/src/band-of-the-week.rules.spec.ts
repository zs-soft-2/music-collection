import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	setDoc,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const WEEK = '2026-W39';

/** The week's band as the weekly run writes it. */
const band = {
	week: WEEK,
	startDay: '2026-09-21',
	endDay: '2026-09-27',
	artistUid: 'artist-metallica',
	artistName: 'Metallica',
	reason: 'random',
	reasonParams: {},
	albumCount: 11,
	playableAlbums: 9,
	pickedAt: 1774000000000,
};

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

const bandOf = (database: ReturnType<typeof asMe>) =>
	doc(database, 'band-of-the-week', WEEK);

/** Puts the week's band up the way the run does, past the rules. */
const chosen = () =>
	testEnv.withSecurityRulesDisabled(async (context) => {
		await setDoc(bandOf(context.firestore() as never), band);
	});

describe('band of the week', () => {
	it('is read by the collector', async () => {
		await chosen();

		await assertSucceeds(getDoc(bandOf(asMe())));
	});

	// It stands in the hero of the home page, which a guest sees too — this
	// is what tells it apart from the daily question.
	it('is read by a visitor', async () => {
		await chosen();

		await assertSucceeds(getDoc(bandOf(asVisitor())));
	});

	it('is not written by a collector', () =>
		assertFails(setDoc(bandOf(asMe()), band)));

	it('is not written by a visitor', () =>
		assertFails(setDoc(bandOf(asVisitor()), band)));
});

/*
 * An archive of the weeks behind is a list query rather than a document
 * read: the rule is the same, but a different call runs into it, and a page
 * whose list fails goes quiet without an error.
 */
describe('the weeks behind', () => {
	const pastWeeks = (database: ReturnType<typeof asMe>) =>
		query(
			collection(database, 'band-of-the-week'),
			orderBy('week', 'desc'),
			limit(12)
		);

	it('are listed by the collector', async () => {
		await chosen();

		await assertSucceeds(getDocs(pastWeeks(asMe())));
	});

	it('are listed by a visitor too', async () => {
		await chosen();

		await assertSucceeds(getDocs(pastWeeks(asVisitor())));
	});
});
