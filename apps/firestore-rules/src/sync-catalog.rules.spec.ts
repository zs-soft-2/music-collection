import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	Timestamp,
	deleteDoc,
	deleteField,
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const PATH = 'sync/catalog';
const ADMIN = 'admin-1';
const ME = 'collector-1';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(async () => {
	await testEnv.clearFirestore();
	await testEnv.withSecurityRulesDisabled(async (context) => {
		const admin = context.firestore();

		await setDoc(
			doc(admin, `security/users/${ADMIN}/effective_permissions`),
			{ permissions: ['ADMIN'], roles: ['ADMIN'] }
		);
		await setDoc(doc(admin, `security/users/${ME}/effective_permissions`), {
			permissions: [
				'createCollectionItemEntity',
				'updateCollectionItemEntity',
			],
			roles: ['USER'],
		});
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

/** The document as the tools and the functions leave it: a stamp per feature. */
const seed = (modifiedAt: Record<string, unknown>) =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(doc(context.firestore(), PATH), { modifiedAt })
	);

/** What `FirestoreSyncService.touch` sends, alongside the write itself. */
const bump = (database: ReturnType<typeof as>, modifiedAt: unknown) =>
	setDoc(doc(database, PATH), { modifiedAt }, { merge: true });

const stamps = (count: number) =>
	Object.fromEntries(
		Array.from({ length: count }, (_unused, index) => [
			`feature-${index}`,
			new Date(),
		])
	);

describe('sync/catalog: the bump a write carries', () => {
	it('is readable by anyone, signed in or not', async () => {
		await seed({ album: new Date() });

		await assertSucceeds(getDoc(doc(asVisitor(), PATH)));
	});

	it('creates the document when the catalog has never been stamped', () =>
		assertSucceeds(bump(as(ME), { user: serverTimestamp() })));

	it('lands on a catalog that is already stamped', async () => {
		await seed({ artist: new Date(), album: new Date() });

		await assertSucceeds(bump(as(ME), { album: serverTimestamp() }));
	});

	it('lands beside the bundles the publisher wrote', async () => {
		await testEnv.withSecurityRulesDisabled((context) =>
			setDoc(doc(context.firestore(), PATH), {
				modifiedAt: { album: new Date() },
				resetAt: { album: new Date() },
				bundles: {
					album: { path: 'bundles/album/1.bundle', count: 2 },
				},
			})
		);

		await assertSucceeds(bump(as(ME), { album: serverTimestamp() }));
	});

	/** A catalog reset to nothing but a full-refresh order, as the copy leaves it. */
	it('lands on a catalog that has no stamps at all yet', async () => {
		await testEnv.withSecurityRulesDisabled((context) =>
			setDoc(doc(context.firestore(), PATH), {
				resetAt: { album: new Date() },
			})
		);

		await assertSucceeds(bump(as(ME), { album: serverTimestamp() }));
	});

	it('travels in the same batch as the write it belongs to', async () => {
		await seed({ 'collection-item': new Date() });

		const database = as(ME);
		const batch = writeBatch(database);

		batch.set(doc(database, `user/${ME}/collection-item/item-1`), {
			userId: ME,
			release: { uid: 'r1' },
			updatedAt: serverTimestamp(),
		});
		batch.set(
			doc(database, PATH),
			{ modifiedAt: { 'collection-item': serverTimestamp() } },
			{ merge: true }
		);

		await assertSucceeds(batch.commit());
	});

	it('is closed to a visitor', () =>
		assertFails(bump(asVisitor(), { album: serverTimestamp() })));
});

/**
 * Every client watches this one document, so a stamp is not only bookkeeping:
 * it is an order to every open client to sync the feature. The rules cannot
 * tell which entity is being written beside it, but they can hold the bump to
 * the shape the client's own write has.
 */
describe('sync/catalog: what a collector cannot do with it', () => {
	it('cannot date a stamp itself', async () => {
		await seed({ album: new Date() });

		// A stamp in the future is not one wasted sync round. The client
		// stores it as its own marker, the real changes fall below it, and
		// from then on the feature is silent until an admin writes `resetAt`.
		await assertFails(
			bump(as(ME), {
				album: Timestamp.fromDate(new Date('2100-01-01')),
			})
		);
	});

	it('cannot stamp with its own clock, however close it runs', async () => {
		await seed({ album: new Date() });

		await assertFails(bump(as(ME), { album: Timestamp.now() }));
	});

	it('cannot put anything but a stamp in place of one', async () => {
		await seed({ album: new Date() });

		// The client compares timestamps; a number here stops the query with
		// an error rather than a wrong answer, and it stops it for everyone.
		await assertFails(bump(as(ME), { album: 1 }));
		await assertFails(bump(as(ME), { album: 'now' }));
		await assertFails(bump(as(ME), 'now'));
	});

	it('cannot order the whole catalog to sync in one write', async () => {
		await seed({ album: new Date(), artist: new Date() });

		await assertFails(
			bump(as(ME), {
				album: serverTimestamp(),
				artist: serverTimestamp(),
			})
		);
	});

	it('cannot take a feature off the document', async () => {
		await seed({ album: new Date(), artist: new Date() });

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				'modifiedAt.album': deleteField(),
			})
		);
	});

	it('cannot fill the document with keys nobody syncs', async () => {
		// A made-up key stays in the document for good, and every client
		// downloads it at every start. One write apiece would otherwise carry
		// the document to the 1 MB a document may hold — after which nobody
		// can bump anything at all.
		await seed(stamps(200));

		await assertFails(bump(as(ME), { 'feature-200': serverTimestamp() }));
	});

	it('still bumps a feature the full document already knows', async () => {
		await seed(stamps(200));

		await assertSucceeds(bump(as(ME), { 'feature-7': serverTimestamp() }));
	});

	it('cannot call for a full re-download at every client', async () => {
		await seed({ album: new Date() });

		await assertFails(
			setDoc(
				doc(as(ME), PATH),
				{ resetAt: { album: serverTimestamp() } },
				{ merge: true }
			)
		);
	});

	it('cannot take the document away', async () => {
		await seed({ album: new Date() });

		await assertFails(deleteDoc(doc(as(ME), PATH)));
	});
});

/** The tools run on the Admin SDK, but the admin pages run as a client. */
describe('sync/catalog: the admin', () => {
	it('stamps as many features as one job touched', async () => {
		await seed({ album: new Date() });

		await assertSucceeds(
			setDoc(
				doc(as(ADMIN), PATH),
				{
					modifiedAt: {
						album: serverTimestamp(),
						artist: serverTimestamp(),
					},
					resetAt: { album: serverTimestamp() },
				},
				{ merge: true }
			)
		);
	});

	it('may take the document away', async () => {
		await seed({ album: new Date() });

		await assertSucceeds(deleteDoc(doc(as(ADMIN), PATH)));
	});
});
