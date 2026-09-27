import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';

/**
 * What the sign-in writes when a collector has no user document yet
 * (`authentication.effects.ts`): the Google profile, and deliberately no
 * role — the rules refuse a user who hands themselves one.
 */
const profile = (fields: Record<string, unknown> = {}) => ({
	displayName: 'A Collector',
	email: 'collector@example.com',
	entityType: 'User',
	firstName: '',
	lastName: '',
	phone: '',
	photoURL: null,
	uid: ME,
	...fields,
});

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

const asMe = () => testEnv.authenticatedContext(ME).firestore();

describe('user: the first sign-in', () => {
	it('lets a collector with no permissions at all create their own document', () =>
		assertSucceeds(
			setDoc(doc(asMe(), `user/${ME}`), {
				...profile(),
				updatedAt: serverTimestamp(),
			})
		));

	/**
	 * FirestoreSyncService writes the document and the sync marker in one
	 * batch, and a batch is refused whole: if the marker were the part the
	 * rules turn down, the sign-in would report the document as refused.
	 */
	it('lets the same write carry its sync marker, as the client sends it', async () => {
		const database = asMe();
		const batch = writeBatch(database);

		batch.set(doc(database, `user/${ME}`), {
			...profile(),
			updatedAt: serverTimestamp(),
		});
		batch.set(
			doc(database, 'sync/catalog'),
			{ modifiedAt: { user: serverTimestamp() } },
			{ merge: true }
		);

		await assertSucceeds(batch.commit());
	});

	/** The marker document exists by the time a second collector signs in. */
	it('lets the marker be bumped on a catalog that already has one', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(doc(context.firestore(), 'sync/catalog'), {
				modifiedAt: { artist: new Date() },
			});
		});

		const database = asMe();
		const batch = writeBatch(database);

		batch.set(doc(database, `user/${ME}`), {
			...profile(),
			updatedAt: serverTimestamp(),
		});
		batch.set(
			doc(database, 'sync/catalog'),
			{ modifiedAt: { user: serverTimestamp() } },
			{ merge: true }
		);

		await assertSucceeds(batch.commit());
	});

	/**
	 * The trap the sign-in falls into. `FirestoreSyncService.set` overwrites
	 * rather than merges, and the profile it sends carries no role — so the
	 * write takes the `roleIds` off a document that already has one, and the
	 * rules turn it down. Rightly: that field is the permission sync's, not
	 * the client's. The sign-in must not write over a user that exists.
	 */
	it('refuses a sign-in that would write the role off an existing user', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(doc(context.firestore(), `user/${ME}`), {
				...profile(),
				roleIds: ['USER'],
			});
		});

		await assertFails(
			setDoc(doc(asMe(), `user/${ME}`), {
				...profile(),
				updatedAt: serverTimestamp(),
			})
		);
	});

	/** Merged, the same write leaves the role where it is. */
	it('lets the same profile through when it is merged', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(doc(context.firestore(), `user/${ME}`), {
				...profile(),
				roleIds: ['USER'],
			});
		});

		await assertSucceeds(
			setDoc(
				doc(asMe(), `user/${ME}`),
				{ ...profile(), updatedAt: serverTimestamp() },
				{ merge: true }
			)
		);
	});

	it('still refuses a collector who hands themselves a role', () =>
		assertFails(
			setDoc(doc(asMe(), `user/${ME}`), {
				...profile({ roleIds: ['ADMIN'] }),
				updatedAt: serverTimestamp(),
			})
		));

	it('still refuses writing somebody else document', () =>
		assertFails(
			setDoc(doc(asMe(), 'user/collector-2'), {
				...profile({ uid: 'collector-2' }),
				updatedAt: serverTimestamp(),
			})
		));
});
