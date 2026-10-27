import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	deleteDoc,
	doc,
	serverTimestamp,
	setDoc,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const OTHER = 'collector-2';
const ITEM = 'copy-1';
const OTHER_ITEM = 'copy-2';
const RELEASE = 'r1';
const PATH = `user/${ME}/collection-item/${ITEM}`;
const OTHER_PATH = `user/${OTHER}/collection-item/${OTHER_ITEM}`;
/** Another pressing of the same album, to move a copy onto. */
const OTHER_RELEASE = 'r2';
/** Copy 123 of the pressing `r1` — the id is the whole of the exclusivity. */
const CLAIM = `copy-serial/${RELEASE}_123`;
/** The same number on that other pressing: a claim of its own. */
const OTHER_CLAIM = `copy-serial/${OTHER_RELEASE}_123`;
/** The tombstone of that claim: the document's path is its id. */
const MARKER = `sync/copy-serial/deletion/copy-serial~${RELEASE}_123`;

/** A claim as the copy page writes it. */
const claim = (fields: Record<string, unknown> = {}) => ({
	releaseId: RELEASE,
	number: 123,
	userId: ME,
	itemId: ITEM,
	...fields,
});

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(async () => {
	await testEnv.clearFirestore();
	await testEnv.withSecurityRulesDisabled(async (context) => {
		const admin = context.firestore();

		for (const uid of [ME, OTHER]) {
			await setDoc(
				doc(admin, `security/users/${uid}/effective_permissions`),
				{
					permissions: [
						'createCollectionItemEntity',
						'updateCollectionItemEntity',
						'deleteCollectionItemEntity',
					],
					roles: ['collector'],
				}
			);
		}
		await setDoc(doc(admin, PATH), {
			userId: ME,
			release: { uid: RELEASE },
		});
		await setDoc(doc(admin, OTHER_PATH), {
			userId: OTHER,
			release: { uid: RELEASE },
		});
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
/** Puts the claim in place as its owner, the way the page would. */
const standingClaim = (owner: string, fields: Record<string, unknown> = {}) =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(doc(context.firestore(), CLAIM), {
			...claim({ userId: owner }),
			...fields,
		})
	);

describe('copy-serial: one number, one collector', () => {
	it('claims a number nobody holds', () =>
		assertSucceeds(setDoc(doc(as(ME), CLAIM), claim())));

	it('refuses the same number to a second collector', async () => {
		await assertSucceeds(setDoc(doc(as(ME), CLAIM), claim()));

		await assertFails(
			setDoc(
				doc(as(OTHER), CLAIM),
				claim({ userId: OTHER, itemId: OTHER_ITEM })
			)
		);
	});

	it('refuses a standing claim even to the collector holding it', async () => {
		await assertSucceeds(setDoc(doc(as(ME), CLAIM), claim()));

		// A claim is written once. Holding it again is an update, and there
		// is no update — the page reads first and writes only what is free.
		await assertFails(setDoc(doc(as(ME), CLAIM), claim()));
	});

	it('refuses a claim taken out in someone else’s name', () =>
		assertFails(setDoc(doc(as(ME), CLAIM), claim({ userId: OTHER }))));

	it('refuses a claim whose id is not the number it says', () =>
		assertFails(
			setDoc(doc(as(ME), `copy-serial/${RELEASE}_999`), claim())
		));

	it('refuses a claim whose id is not the pressing it says', () =>
		assertFails(setDoc(doc(as(ME), 'copy-serial/r9_123'), claim())));

	it('refuses a number counted from zero', () =>
		assertFails(
			setDoc(
				doc(as(ME), `copy-serial/${RELEASE}_0`),
				claim({ number: 0 })
			)
		));

	/**
	 * Adding a record and numbering it are one gesture: the number has to be
	 * held before the copy exists, so there is nothing to point at yet.
	 */
	it('claims a number for a copy that does not exist yet', () =>
		assertSucceeds(setDoc(doc(as(ME), CLAIM), claim({ itemId: null }))));

	it('refuses a claim pointing at nothing in particular', () =>
		assertFails(setDoc(doc(as(ME), CLAIM), claim({ itemId: '' }))));

	it('refuses anything smuggled into the claim', () =>
		assertFails(
			setDoc(doc(as(ME), CLAIM), claim({ note: 'mine, honestly' }))
		));

	it('lets the holder release it', async () => {
		await standingClaim(ME);

		await assertSucceeds(deleteDoc(doc(as(ME), CLAIM)));
	});

	it('refuses to release a claim held by another collector', async () => {
		await standingClaim(OTHER);

		await assertFails(deleteDoc(doc(as(ME), CLAIM)));
	});

	/**
	 * How the client gives a number back: `FirestoreSyncService.delete`
	 * deletes the claim and writes the tombstone in one batch, and a batch is
	 * refused whole — so the tombstone has to pass on its own.
	 *
	 * That the rule can read the claim at all is what this proves: the
	 * document is deleted in the same batch, and the rules see the state
	 * before it.
	 */
	it('releases the claim and leaves its tombstone in one batch', async () => {
		await standingClaim(ME);

		const database = as(ME);
		const batch = writeBatch(database);

		batch.delete(doc(database, CLAIM));
		batch.set(doc(database, MARKER), {
			path: CLAIM,
			deletedAt: serverTimestamp(),
		});
		batch.set(
			doc(database, 'sync/catalog'),
			{ modifiedAt: { 'copy-serial': serverTimestamp() } },
			{ merge: true }
		);

		await assertSucceeds(batch.commit());
	});

	/**
	 * The tombstone is an order to every open client to read that document
	 * again (`FirestoreSyncService.evictDeleted`). The id carries no uid — a
	 * claim is `{pressing}_{number}` — so the claim itself says whose it is.
	 */
	it('refuses the tombstone of a claim another collector holds', async () => {
		await standingClaim(OTHER);

		await assertFails(
			setDoc(doc(as(ME), MARKER), {
				path: CLAIM,
				deletedAt: serverTimestamp(),
			})
		);
	});

	it('refuses a tombstone for a claim that was never taken', () =>
		assertFails(
			setDoc(doc(as(ME), MARKER), {
				path: CLAIM,
				deletedAt: serverTimestamp(),
			})
		));

	it('refuses a tombstone pointing somewhere else than its own id', async () => {
		await standingClaim(ME);

		await assertFails(
			setDoc(doc(as(ME), MARKER), {
				path: OTHER_PATH,
				deletedAt: serverTimestamp(),
			})
		);
	});

	/** A stamp of the client's own choosing would come back every round. */
	it('refuses a tombstone stamped by the client', async () => {
		await standingClaim(ME);

		await assertFails(
			setDoc(doc(as(ME), MARKER), {
				path: CLAIM,
				deletedAt: new Date(Date.now() + 60 * 60 * 1000),
			})
		);
	});

	it('refuses anything smuggled into the tombstone', async () => {
		await standingClaim(ME);

		await assertFails(
			setDoc(doc(as(ME), MARKER), {
				path: CLAIM,
				deletedAt: serverTimestamp(),
				count: 500,
			})
		);
	});
});

describe('collection-item: the number on the copy', () => {
	it('writes a number the collector holds the claim to', async () => {
		await standingClaim(ME);

		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);
	});

	it('writes a number whose edition size is unknown', async () => {
		await standingClaim(ME);

		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: null },
			})
		);
	});

	it('refuses a number with no claim behind it', () =>
		assertFails(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		));

	it('refuses a number another collector holds', async () => {
		await standingClaim(OTHER);

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);
	});

	it('refuses the 600th copy of an edition of 500', async () => {
		await standingClaim(ME, { number: 600 });

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 600, total: 500 },
			})
		);
	});

	it('refuses anything smuggled in beside the number', async () => {
		await standingClaim(ME);

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500, signed: true },
			})
		);
	});

	it('clears the number', () =>
		assertSucceeds(updateDoc(doc(as(ME), PATH), { serial: null })));

	/**
	 * The record was sold: the number goes back to the registry so the buyer
	 * can register it, while the copy keeps, as history, what it wore. That
	 * only works if a released claim does not lock the rest of the page.
	 */
	it('still edits a copy whose number has been given back', async () => {
		await standingClaim(ME);
		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);
		await assertSucceeds(deleteDoc(doc(as(ME), CLAIM)));

		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), { story: 'Sold it in the spring.' })
		);
	});

	it('refuses to move the number once the claim is gone', async () => {
		await standingClaim(ME);
		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);
		await assertSucceeds(deleteDoc(doc(as(ME), CLAIM)));

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 124, total: 500 },
			})
		);
	});

	it('creates a copy with a number it holds', async () => {
		await standingClaim(ME, { itemId: 'copy-3' });

		await assertSucceeds(
			setDoc(doc(as(ME), `user/${ME}/collection-item/copy-3`), {
				userId: ME,
				release: { uid: RELEASE },
				serial: { number: 123, total: 500 },
			})
		);
	});

	/** The common path: almost no record is numbered. */
	it('creates a copy that carries no number', () =>
		assertSucceeds(
			setDoc(doc(as(ME), `user/${ME}/collection-item/copy-3`), {
				userId: ME,
				release: { uid: RELEASE },
				serial: null,
			})
		));

	it('refuses to create a copy with a number it does not hold', () =>
		assertFails(
			setDoc(doc(as(ME), `user/${ME}/collection-item/copy-3`), {
				userId: ME,
				release: { uid: RELEASE },
				serial: { number: 123, total: 500 },
			})
		));
});

/**
 * Moving a copy onto another pressing of the same album — the collector
 * found the release they actually own.
 *
 * A claim is for a number *on a pressing*, so carrying the copy to another
 * one needs a claim there just as writing a new number does. Otherwise the
 * number could walk onto a pressing where another collector has registered
 * it, and the registry would fail at exactly the thing it exists for.
 */
describe('collection-item: moving the copy onto another release', () => {
	/** The common case: almost no record is numbered. */
	it('moves a copy that carries no number', () =>
		assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				release: { uid: OTHER_RELEASE },
			})
		));

	it('moves a numbered copy onto a release whose number it holds', async () => {
		await standingClaim(ME);
		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);
		await testEnv.withSecurityRulesDisabled((context) =>
			setDoc(doc(context.firestore(), OTHER_CLAIM), {
				releaseId: OTHER_RELEASE,
				number: 123,
				userId: ME,
				itemId: ITEM,
			})
		);

		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				release: { uid: OTHER_RELEASE },
			})
		);
	});

	it('refuses to carry the number onto a release it holds no claim on', async () => {
		await standingClaim(ME);
		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				release: { uid: OTHER_RELEASE },
			})
		);
	});

	it('refuses to carry the number onto a release another collector holds it on', async () => {
		await standingClaim(ME);
		await assertSucceeds(
			updateDoc(doc(as(ME), PATH), {
				serial: { number: 123, total: 500 },
			})
		);
		await testEnv.withSecurityRulesDisabled((context) =>
			setDoc(doc(context.firestore(), OTHER_CLAIM), {
				releaseId: OTHER_RELEASE,
				number: 123,
				userId: OTHER,
				itemId: OTHER_ITEM,
			})
		);

		await assertFails(
			updateDoc(doc(as(ME), PATH), {
				release: { uid: OTHER_RELEASE },
			})
		);
	});

	it('refuses to move a copy of another collector', () =>
		assertFails(
			updateDoc(doc(as(ME), OTHER_PATH), {
				release: { uid: OTHER_RELEASE },
			})
		));
});
