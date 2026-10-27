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

	it('refuses the delete to a collector as well', async () => {
		const collector = testEnv.authenticatedContext('collector-1').firestore();

		await assertFails(deleteDoc(doc(collector, ROOT_PATH)));
	});
});
