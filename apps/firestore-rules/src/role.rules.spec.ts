import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	collection,
	serverTimestamp,
	setDoc,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const PATH = 'role/EDITOR';
const ADMIN = 'admin-1';
const COLLECTOR = 'collector-1';

/** What the role admin page writes, plus the sync service's own stamp. */
const role = (fields: Record<string, unknown> = {}) => ({
	description: 'Edits the catalog.',
	name: 'EDITOR',
	permissions: ['createAlbumEntity', 'updateAlbumEntity'],
	uid: 'EDITOR',
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
					'createRoleEntity',
					'updateRoleEntity',
					'deleteRoleEntity',
					'viewUserEntity',
					'updateUserEntity',
				],
				roles: ['admin'],
			}
		);
		await setDoc(
			doc(admin, `security/users/${COLLECTOR}/effective_permissions`),
			{
				permissions: ['createCollectionItemEntity'],
				roles: ['USER'],
			}
		);
		await setDoc(doc(admin, PATH), role());
		await setDoc(doc(admin, `user/${COLLECTOR}`), {
			displayName: 'A Collector',
			entityType: 'User',
			roleIds: ['USER'],
			uid: COLLECTOR,
		});
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

describe('role/{roleId}', () => {
	/**
	 * Every signed-in client may read the roles — the admin pages need the
	 * list, and there is nothing secret in a name and a list of permissions.
	 * What a role *grants* is not read from here: that is the effective
	 * permissions document, which each user may read only for themselves.
	 */
	it('is readable by anybody signed in', async () => {
		await assertSucceeds(getDoc(doc(as(COLLECTOR), PATH)));
		await assertSucceeds(getDocs(collection(as(COLLECTOR), 'role')));
	});

	it('is not readable by a visitor', async () => {
		await assertFails(getDoc(doc(asVisitor(), PATH)));
	});

	it('is written by whoever may edit the roles', async () => {
		await assertSucceeds(
			setDoc(
				doc(as(ADMIN), 'role/REVIEWER'),
				role({ name: 'REVIEWER', uid: 'REVIEWER' })
			)
		);
		await assertSucceeds(
			setDoc(doc(as(ADMIN), PATH), role({ permissions: ['ADMIN'] }))
		);
		await assertSucceeds(deleteDoc(doc(as(ADMIN), PATH)));
	});

	/**
	 * The one write this page must never allow: a collector handing
	 * themselves a permission by writing the role they already hold.
	 */
	it('is not written by a collector', async () => {
		await assertFails(
			setDoc(doc(as(COLLECTOR), PATH), role({ permissions: ['ADMIN'] }))
		);
		await assertFails(deleteDoc(doc(as(COLLECTOR), PATH)));
	});

	it('refuses a role without a name', async () => {
		await assertFails(setDoc(doc(as(ADMIN), PATH), role({ name: '' })));
		await assertFails(setDoc(doc(as(ADMIN), PATH), role({ name: 7 })));
	});

	it('refuses permissions that are not a list', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), PATH), role({ permissions: 'ADMIN' }))
		);
	});

	/**
	 * The page offers about a hundred; well past that the list stops being a
	 * list, and it is copied into the sync document of every holder.
	 */
	it('refuses a permission list nothing could have produced', async () => {
		await assertFails(
			setDoc(
				doc(as(ADMIN), PATH),
				role({
					permissions: Array.from(
						{ length: 201 },
						(_, index) => `p${index}`
					),
				})
			)
		);
	});

	/**
	 * FirestoreSyncService deletes the document and writes the tombstone in
	 * one batch, and a batch is refused whole — so the tombstone needs a rule
	 * of its own, which it gets from `syncResources()`.
	 */
	it('lets the delete carry its sync marker, as the client sends it', async () => {
		const database = as(ADMIN);
		const batch = writeBatch(database);

		batch.delete(doc(database, PATH));
		batch.set(doc(database, 'sync/role/deletion/role~EDITOR'), {
			path: PATH,
			deletedAt: serverTimestamp(),
		});
		batch.set(
			doc(database, 'sync/catalog'),
			{ modifiedAt: { role: serverTimestamp() } },
			{ merge: true }
		);

		await assertSucceeds(batch.commit());
	});
});

describe('user/{uid}.roleIds', () => {
	it('is written by whoever may edit the users', async () =>
		assertSucceeds(
			updateDoc(doc(as(ADMIN), `user/${COLLECTOR}`), {
				roleIds: ['EDITOR'],
				updatedAt: serverTimestamp(),
			})
		));

	/** The whole point of keeping the field out of the user's own hands. */
	it('is not written by the user themselves', async () =>
		assertFails(
			updateDoc(doc(as(COLLECTOR), `user/${COLLECTOR}`), {
				roleIds: ['EDITOR'],
				updatedAt: serverTimestamp(),
			})
		));

	/**
	 * The admin page clears the legacy embedded roles in the same write, so
	 * that a role taken away here is not handed back by a second reference
	 * the permission sync would still find.
	 */
	it('may be written together with the legacy embedded roles', async () =>
		assertSucceeds(
			updateDoc(doc(as(ADMIN), `user/${COLLECTOR}`), {
				roleIds: ['EDITOR'],
				roles: [],
				updatedAt: serverTimestamp(),
			})
		));

	it('is listed only by whoever may view the users', async () => {
		await assertSucceeds(getDocs(collection(as(ADMIN), 'user')));
		await assertFails(getDocs(collection(as(COLLECTOR), 'user')));
	});
});
