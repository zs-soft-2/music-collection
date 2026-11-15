import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

/**
 * Both places a pressing lives: the root collection and the artist's tree.
 * Whichever wrote it, the rules have to answer the same way.
 */
const ROOT_PATH = 'release/r1';
const NESTED_PATH = 'artist/a1/album/al1/release/r1';
const ADMIN = 'admin-1';

/** A pressing as the catalog writes it, stamp and all. */
const release = (fields: Record<string, unknown> = {}) => ({
	album: { uid: 'al1', name: 'Master of Puppets' },
	artist: { uid: 'a1', name: 'Metallica' },
	entityType: 'Release',
	media: 'vinyl',
	name: 'Master of Puppets — 1986 EU',
	uid: 'r1',
	updatedAt: serverTimestamp(),
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

		await setDoc(
			doc(admin, `security/users/${ADMIN}/effective_permissions`),
			{
				permissions: [
					'createReleaseEntity',
					'updateReleaseEntity',
					'deleteReleaseEntity',
				],
				roles: ['admin'],
			}
		);
		await setDoc(doc(admin, ROOT_PATH), release());
		await setDoc(doc(admin, NESTED_PATH), release());
	});
});

describe('release rules', () => {
	it('refuses the delete even with deleteReleaseEntity', async () => {
		// The permission is real and the callable asks for it; what it does
		// not buy is a delete straight from the client, because whether a
		// collector owns a copy can only be settled on the server.
		const admin = testEnv.authenticatedContext(ADMIN).firestore();

		await assertFails(deleteDoc(doc(admin, ROOT_PATH)));
		await assertFails(deleteDoc(doc(admin, NESTED_PATH)));
	});

	it('lets the admin archive the pressing instead', async () => {
		const admin = testEnv.authenticatedContext(ADMIN).firestore();

		await assertSucceeds(
			setDoc(
				doc(admin, ROOT_PATH),
				{ active: false, updatedAt: serverTimestamp() },
				{ merge: true }
			)
		);
	});

	// The tier decides a collector's score, so only the server writes it.
	it('refuses a client write that changes the rarity or the override', async () => {
		const admin = testEnv.authenticatedContext(ADMIN).firestore();
		const change = (path: string, fields: Record<string, unknown>) =>
			setDoc(
				doc(admin, path),
				{ ...fields, updatedAt: serverTimestamp() },
				{ merge: true }
			);

		for (const path of [ROOT_PATH, NESTED_PATH]) {
			await assertFails(
				change(path, {
					rarity: { tier: 'ultraRare', source: 'manual' },
				})
			);
			await assertFails(
				change(path, {
					rarityOverride: { tier: 'ultraRare', note: 'mine' },
				})
			);
		}
	});

	it('lets the admin edit a pressing the server has already rated', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(
				doc(context.firestore(), ROOT_PATH),
				release({
					rarity: { tier: 'rare', source: 'discogs', have: 214 },
				})
			);
		});

		const admin = testEnv.authenticatedContext(ADMIN).firestore();

		// A merge leaves the tier where the server put it.
		await assertSucceeds(
			setDoc(
				doc(admin, ROOT_PATH),
				{
					name: 'Master of Puppets — 1986 UK',
					updatedAt: serverTimestamp(),
				},
				{ merge: true }
			)
		);
	});

	it('refuses a new pressing that brings its own rarity', async () => {
		const admin = testEnv.authenticatedContext(ADMIN).firestore();

		await assertFails(
			setDoc(
				doc(admin, 'release/r2'),
				release({ uid: 'r2', rarity: { tier: 'ultraRare' } })
			)
		);
		await assertSucceeds(
			setDoc(doc(admin, 'release/r2'), release({ uid: 'r2' }))
		);
	});

	it('takes an edition size only as a whole number that makes sense', async () => {
		const admin = testEnv.authenticatedContext(ADMIN).firestore();
		const size = (editionSize: unknown) =>
			setDoc(
				doc(admin, ROOT_PATH),
				{ editionSize, updatedAt: serverTimestamp() },
				{ merge: true }
			);

		await assertSucceeds(size(500));
		await assertSucceeds(size(null));
		await assertFails(size(0));
		await assertFails(size(1_000_001));
		await assertFails(size(12.5));
		await assertFails(size('500'));
	});

	it('refuses the delete to a collector as well', async () => {
		const collector = testEnv
			.authenticatedContext('collector-1')
			.firestore();

		await assertFails(deleteDoc(doc(collector, ROOT_PATH)));
	});
});
