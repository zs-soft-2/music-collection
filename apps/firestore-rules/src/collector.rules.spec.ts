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

/** One rendered from the avatar wardrobe, in our own bucket. */
const OWN_PICTURE =
	'https://firebasestorage.googleapis.com/v0/b/' +
	'music-collection-16676.firebasestorage.app/o/' +
	`user-avatar%2F${ME}%2Favatar.jpg?alt=media&v=1`;

/** What the client writes: the snapshot, with the stamp the sync service adds. */
const profile = (fields: Record<string, unknown> = {}) => ({
	uid: ME,
	numbers: {
		copies: 12,
		albums: 10,
		artists: 7,
		byFormat: { vinyl: 11, cd: 1 },
		oldestYear: 1972,
		since: 2019,
	},
	points: { total: 340, completedCollections: 2 },
	badges: [],
	pursuits: [],
	showcase: [],
	updatedAt: serverTimestamp(),
	...fields,
});

/** A list of as many look-alike entries as a case needs. */
const entries = (count: number, entry: Record<string, unknown>) =>
	Array.from({ length: count }, (_unused, index) => ({
		...entry,
		title: `Record ${index}`,
	}));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asStranger = () => testEnv.authenticatedContext(SOMEONE_ELSE).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

/** Puts a profile out there without asking the rules. */
const publish = (fields: Record<string, unknown> = {}) =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(doc(context.firestore(), 'collector', ME), profile(fields))
	);

describe('collector: who may read it', () => {
	/**
	 * The whole point of the feature: a stranger who was sent a link sees a
	 * shelf and may want one of their own. A signed-out visit is one read.
	 */
	it('lets a signed-out visitor read a shared profile', async () => {
		await publish();

		await assertSucceeds(getDoc(doc(asVisitor(), 'collector', ME)));
	});

	it('lets another collector read it', async () => {
		await publish();

		await assertSucceeds(getDoc(doc(asStranger(), 'collector', ME)));
	});
});

describe('collector: who may write it', () => {
	it('publishes the collector own profile', () =>
		assertSucceeds(setDoc(doc(asMe(), 'collector', ME), profile())));

	it('refuses a profile written in somebody else name', () =>
		assertFails(setDoc(doc(asStranger(), 'collector', ME), profile())));

	it('refuses a signed-out write', () =>
		assertFails(setDoc(doc(asVisitor(), 'collector', ME), profile())));

	/** The document id is the collector; a `uid` saying otherwise is a lie. */
	it('refuses a profile whose uid is not its own document', () =>
		assertFails(
			setDoc(doc(asMe(), 'collector', ME), profile({ uid: SOMEONE_ELSE }))
		));

	it('withdraws the profile by deleting it', async () => {
		await publish();

		await assertSucceeds(deleteDoc(doc(asMe(), 'collector', ME)));
	});

	it('refuses a stranger taking the profile down', async () => {
		await publish();

		await assertFails(deleteDoc(doc(asStranger(), 'collector', ME)));
	});
});

describe('collector: pont igen, pénz nem', () => {
	/**
	 * The page shows points and never money. The key list is where that is
	 * decided: a field it does not name cannot be in the document at all, so
	 * no later version of the page can start drawing one.
	 */
	it('refuses what a copy cost', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ purchase: { price: 12000, currency: 'HUF' } })
			)
		));

	it('refuses an estimated worth of the collection', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ estimatedValue: 1_250_000 })
			)
		));

	it('refuses a visibility flag — the document itself is the sharing', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ visibility: 'public' })
			)
		));
});

describe('collector: the name and the picture', () => {
	it('carries a name and a picture of the wardrobe', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ displayName: 'Zsolt', photoURL: OWN_PICTURE })
			)
		));

	/**
	 * The picture goes into an `<img src>` in a stranger's browser. An
	 * address of the owner's choosing would have every visitor of the page
	 * announce themselves to whatever server that is.
	 */
	it('refuses a picture from anywhere else', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ photoURL: 'https://tracker.test/pixel.png' })
			)
		));
});

describe('collector: the place comes from the map consent', () => {
	it('carries a country and a city', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ countryCode: 'HU', city: 'Budapest' })
			)
		));

	it('refuses a country that is not a country code', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ countryCode: 'Hungary' })
			)
		));

	it('refuses a city that is an address', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ city: 'x'.repeat(61) })
			)
		));
});

describe('collector: the shape of the numbers', () => {
	it('refuses a count that is not a count', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({
					numbers: {
						copies: 'many',
						albums: 10,
						artists: 7,
						byFormat: {},
						oldestYear: null,
						since: null,
					},
				})
			)
		));

	it('refuses a field the numbers do not have', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({
					numbers: {
						copies: 12,
						albums: 10,
						artists: 7,
						byFormat: {},
						oldestYear: null,
						since: null,
						spentTotal: 400000,
					},
				})
			)
		));

	/** A map with free keys is a way to push the document to its 1 MB limit. */
	it('refuses a format breakdown with made-up keys', () => {
		const byFormat: Record<string, number> = {};

		for (let index = 0; index < 11; index += 1) {
			byFormat[`format-${index}`] = 1;
		}

		return assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({
					numbers: {
						copies: 12,
						albums: 10,
						artists: 7,
						byFormat,
						oldestYear: null,
						since: null,
					},
				})
			)
		);
	});

	it('refuses points below zero', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ points: { total: -5, completedCollections: 0 } })
			)
		));
});

describe('collector: how long the lists may be', () => {
	const record = {
		artistName: 'Slayer',
		year: 1986,
		format: 'vinyl',
		coverUrl: null,
		editions: [],
	};
	const wanted = {
		artistName: 'Megadeth',
		coverUrl: null,
		medias: ['vinyl'],
	};

	it('takes a full shop window', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ showcase: entries(24, record) })
			)
		));

	it('refuses one record more than the window fits', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ showcase: entries(25, record) })
			)
		));

	it('takes a wishlist worth buying from', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ wishlist: entries(200, wanted) })
			)
		));

	it('refuses a wishlist beyond its limit', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ wishlist: entries(201, wanted) })
			)
		));

	it('refuses a showcase that is not a list', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'collector', ME),
				profile({ showcase: 'everything' })
			)
		));
});

describe('collector: the full shelf', () => {
	const list = (count: number) => ({
		uid: ME,
		count,
		albums: Array.from({ length: count }, (_unused, index) => ({
			title: `Record ${index}`,
			artistName: 'Slayer',
			year: 1986,
			format: 'vinyl',
		})),
		updatedAt: serverTimestamp(),
	});

	const listRef = (context: ReturnType<typeof asMe>) =>
		doc(context, 'collector', ME, 'albums', 'all');

	const publishList = (count: number) =>
		testEnv.withSecurityRulesDisabled((context) =>
			setDoc(
				doc(context.firestore(), 'collector', ME, 'albums', 'all'),
				list(count)
			)
		);

	it('publishes the whole shelf', () =>
		assertSucceeds(setDoc(listRef(asMe()), list(3))));

	it('lets a signed-out visitor read it while the page stands', async () => {
		await publish();
		await publishList(3);

		await assertSucceeds(getDoc(listRef(asVisitor())));
	});

	/**
	 * Withdrawing deletes the page, and Firestore does not cascade. A list
	 * left behind under a deleted page must not go on being a published
	 * shelf — so the rules refuse it as soon as the page is gone.
	 */
	it('refuses the list once the page above it is gone', async () => {
		await publishList(3);

		await assertFails(getDoc(listRef(asVisitor())));
	});

	it('refuses a list written in somebody else name', () =>
		assertFails(setDoc(listRef(asStranger()), list(3))));

	it('takes a shelf at the limit', () =>
		assertSucceeds(setDoc(listRef(asMe()), list(3000))));

	it('refuses one record past the limit', () =>
		assertFails(setDoc(listRef(asMe()), list(3001))));

	it('refuses a field the list does not have', () =>
		assertFails(setDoc(listRef(asMe()), { ...list(1), prices: [12000] })));

	it('withdraws the list by deleting it', async () => {
		await publishList(3);

		await assertSucceeds(deleteDoc(listRef(asMe())));
	});
});

describe('collector: withdrawing tells the other clients', () => {
	/** The tombstone is what makes an open page drop the profile it cached. */
	const marker = (uid: string) => ({
		path: `collector/${uid}`,
		deletedAt: serverTimestamp(),
	});

	it('writes the tombstone of its own profile', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'sync', 'collector', 'deletion', `collector~${ME}`),
				marker(ME)
			)
		));

	it('refuses a tombstone for somebody else profile', () =>
		assertFails(
			setDoc(
				doc(
					asMe(),
					'sync',
					'collector',
					'deletion',
					`collector~${SOMEONE_ELSE}`
				),
				marker(SOMEONE_ELSE)
			)
		));
});
