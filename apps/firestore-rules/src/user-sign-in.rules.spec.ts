import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	doc,
	serverTimestamp,
	setDoc,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';

/** A Google profile picture, which is where a collector's first one is from. */
const GOOGLE_PICTURE = 'https://lh3.googleusercontent.com/a/ACg8ocK=s96-c';
/** One rendered from the avatar wardrobe, in our own bucket. */
const OWN_PICTURE =
	'https://firebasestorage.googleapis.com/v0/b/' +
	'music-collection-16676.firebasestorage.app/o/' +
	`user-avatar%2F${ME}%2Favatar.jpg?alt=media&v=1`;

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

/**
 * The name and the picture are the two fields that leave the document with
 * the collector: the leaderboard prints the name, and the map puts the
 * picture in an `<img src>` in every other collector's browser. Both are
 * written by the collector themselves, so both have a shape.
 */
describe('user: the name and the picture', () => {
	const signedIn = (fields: Record<string, unknown>) =>
		setDoc(doc(asMe(), `user/${ME}`), {
			...profile(fields),
			updatedAt: serverTimestamp(),
		});

	it('takes the Google picture the sign-in hands over', () =>
		assertSucceeds(signedIn({ photoURL: GOOGLE_PICTURE })));

	it('takes the figure rendered on the profile page', () =>
		assertSucceeds(signedIn({ photoURL: OWN_PICTURE })));

	it('refuses a picture from anywhere else', () =>
		assertFails(signedIn({ photoURL: 'https://example.test/z.jpg' })));

	/** `https://lh3.googleusercontent.com@example.test/z.jpg` is not Google. */
	it('refuses an address wearing the Google host as a username', () =>
		assertFails(
			signedIn({
				photoURL:
					'https://lh3.googleusercontent.com@example.test/z.jpg',
			})
		));

	it('refuses a picture smuggled in as a data URI', () =>
		assertFails(
			signedIn({
				photoURL: `data:image/png;base64,${'A'.repeat(4000)}`,
			})
		));

	it('refuses a name that would fill the document', () =>
		assertFails(signedIn({ displayName: 'Z'.repeat(1001) })));

	it('refuses a name written over several lines', () =>
		assertFails(signedIn({ displayName: 'Zsolt\n\n\n\nEverybody else' })));

	it('takes a collector with no name and no picture at all', () =>
		assertSucceeds(signedIn({ displayName: null, photoURL: null })));

	/**
	 * The 2022 production data cannot be true to a rule written in 2026, and
	 * a document with an address nobody would write today has to stay
	 * editable — what it must not do is take a new one.
	 */
	it('leaves an address written before this rule where it is', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(doc(context.firestore(), `user/${ME}`), {
				...profile({ photoURL: 'https://example.test/old.jpg' }),
			});
		});

		await assertSucceeds(
			updateDoc(doc(asMe(), `user/${ME}`), { firstName: 'Zsolt' })
		);
		await assertFails(
			updateDoc(doc(asMe(), `user/${ME}`), {
				photoURL: 'https://example.test/new.jpg',
			})
		);
	});
});
