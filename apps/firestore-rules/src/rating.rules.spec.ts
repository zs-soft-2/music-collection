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
const ALBUM = 'album-1';

/** A verdict, as the album page writes it. */
const verdict = (overrides: Record<string, unknown> = {}) => ({
	uid: ALBUM,
	albumId: ALBUM,
	albumTitle: 'Selling England by the Pound',
	artistName: 'Genesis',
	stars: 5,
	note: 'The pressing to own',
	ratedAt: 1000,
	updatedAt: serverTimestamp(),
	...overrides,
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

const rating = (database: ReturnType<typeof asMe>, uid = ME, albumId = ALBUM) =>
	doc(database, 'user', uid, 'rating', albumId);

/** Puts a verdict in place without asking the rules. */
const rated = () =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(rating(context.firestore() as never), verdict())
	);

describe('rating: the collector', () => {
	it('rates a record of their own', () =>
		assertSucceeds(setDoc(rating(asMe()), verdict())));

	it('reads their own verdict back', async () => {
		await rated();

		await assertSucceeds(getDoc(rating(asMe())));
	});

	it('changes their mind rather than voting twice', async () => {
		await rated();

		await assertSucceeds(setDoc(rating(asMe()), verdict({ stars: 3 })));
	});

	it('takes a verdict back', async () => {
		await rated();

		await assertSucceeds(deleteDoc(rating(asMe())));
	});

	it('rates a record with the stars alone', () =>
		assertSucceeds(setDoc(rating(asMe()), verdict({ note: null }))));
});

describe('rating: the scale', () => {
	it('refuses stars off the scale', async () => {
		await assertFails(setDoc(rating(asMe()), verdict({ stars: 0 })));
		await assertFails(setDoc(rating(asMe()), verdict({ stars: 6 })));
		await assertFails(setDoc(rating(asMe()), verdict({ stars: -1 })));
	});

	it('refuses a star between two stars', () =>
		assertFails(setDoc(rating(asMe()), verdict({ stars: 4.5 }))));

	it('refuses stars that are not a number at all', () =>
		assertFails(setDoc(rating(asMe()), verdict({ stars: '5' }))));

	it('refuses a verdict with no stars in it', () =>
		assertFails(
			setDoc(rating(asMe()), {
				uid: ALBUM,
				albumId: ALBUM,
				ratedAt: 1000,
				updatedAt: serverTimestamp(),
			})
		));
});

describe('rating: one record, one verdict', () => {
	it('refuses a verdict filed under another record', () =>
		assertFails(
			setDoc(rating(asMe(), ME, 'album-2'), verdict({ albumId: ALBUM }))
		));

	it('refuses a verdict whose own id disagrees with the document', () =>
		assertFails(setDoc(rating(asMe()), verdict({ uid: 'album-2' }))));
});

describe('rating: what the document may hold', () => {
	it('refuses a field the server knows nothing about', () =>
		assertFails(setDoc(rating(asMe()), verdict({ weight: 10 }))));

	it('refuses a note longer than the rules allow', () =>
		assertFails(
			setDoc(rating(asMe()), verdict({ note: 'a'.repeat(281) }))
		));

	it('refuses a note that is not a line of text', () =>
		assertFails(setDoc(rating(asMe()), verdict({ note: 5 }))));
});

describe('rating: everybody else', () => {
	it('is not read by a stranger', async () => {
		await rated();

		await assertFails(getDoc(rating(asStranger(), ME)));
	});

	it('is not written by a stranger', () =>
		assertFails(setDoc(rating(asStranger(), ME), verdict())));

	it('is not read by a visitor', async () => {
		await rated();

		await assertFails(getDoc(rating(asVisitor(), ME)));
	});

	it('is not written by a visitor', () =>
		assertFails(setDoc(rating(asVisitor(), ME), verdict())));
});

describe('rating: taking it back tells the other clients', () => {
	/** The tombstone is what makes the collector's other device let go. */
	const marker = (uid: string, albumId = ALBUM) => ({
		path: `user/${uid}/rating/${albumId}`,
		deletedAt: serverTimestamp(),
	});

	const tombstone = (
		database: ReturnType<typeof asMe>,
		uid: string,
		albumId = ALBUM
	) =>
		doc(
			database,
			'sync',
			'rating',
			'deletion',
			`user~${uid}~rating~${albumId}`
		);

	it('writes the tombstone of its own verdict', () =>
		assertSucceeds(setDoc(tombstone(asMe(), ME), marker(ME))));

	it('refuses a tombstone over somebody else verdict', () =>
		assertFails(
			setDoc(tombstone(asMe(), SOMEONE_ELSE), marker(SOMEONE_ELSE))
		));

	it('refuses a tombstone from a visitor', () =>
		assertFails(setDoc(tombstone(asVisitor(), ME), marker(ME))));
});

describe('album-rating: the community average', () => {
	const summary = {
		albumId: ALBUM,
		count: 7,
		average: 4.1,
		histogram: [0, 0, 1, 4, 2],
		updatedAt: serverTimestamp(),
	};

	const average = (database: ReturnType<typeof asMe>) =>
		doc(database, 'album-rating', ALBUM);

	const summed = () =>
		testEnv.withSecurityRulesDisabled((context) =>
			setDoc(average(context.firestore() as never), summary)
		);

	it('is read by anybody, signed in or not', async () => {
		await summed();

		await assertSucceeds(getDoc(average(asMe())));
		await assertSucceeds(getDoc(average(asVisitor())));
	});

	it('is written by the server alone', async () => {
		await assertFails(setDoc(average(asMe()), summary));

		await summed();

		await assertFails(setDoc(average(asMe()), { ...summary, average: 5 }));
		await assertFails(deleteDoc(average(asMe())));
	});
});

describe('collector: the favourites on a shared page', () => {
	/** A page as the snapshot writes it, with the verdicts the collector shares. */
	const page = (favourites: unknown[] | undefined) => {
		const document: Record<string, unknown> = {
			uid: ME,
			numbers: {
				copies: 1,
				albums: 1,
				artists: 1,
				byFormat: { vinyl: 1 },
				oldestYear: 1984,
				since: 2020,
			},
			points: { total: 0, completedCollections: 0 },
			badges: [],
			pursuits: [],
			showcase: [],
			updatedAt: serverTimestamp(),
		};

		if (favourites) {
			document['favourites'] = favourites;
		}

		return document;
	};

	const favourite = (title = 'Powerslave') => ({
		title,
		artistName: 'Iron Maiden',
		stars: 5,
		note: 'The one to own',
	});

	const profile = (database: ReturnType<typeof asMe>, uid = ME) =>
		doc(database, 'collector', uid);

	it('publishes a page with the verdicts on it', () =>
		assertSucceeds(
			setDoc(profile(asMe()), page([favourite(), favourite('Piece')]))
		));

	it('publishes a page without them, which is the usual case', () =>
		assertSucceeds(setDoc(profile(asMe()), page(undefined))));

	it('refuses more verdicts than the page carries', () =>
		assertFails(
			setDoc(
				profile(asMe()),
				page(
					Array.from({ length: 11 }, (_unused, index) =>
						favourite(`Record ${index}`)
					)
				)
			)
		));

	it('refuses a favourites field that is not a list', () =>
		assertFails(setDoc(profile(asMe()), page('Powerslave' as never))));

	it('is not published onto somebody else page', () =>
		assertFails(
			setDoc(profile(asStranger(), ME), {
				...page([favourite()]),
				uid: ME,
			})
		));
});
