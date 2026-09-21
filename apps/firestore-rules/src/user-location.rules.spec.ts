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

/** What the client writes: the pin, with the stamp the sync service adds. */
const pin = (fields: Record<string, unknown>) => ({
	uid: ME,
	countryCode: 'HU',
	updatedAt: serverTimestamp(),
	...fields,
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

/** Puts a pin out there without asking the rules. */
const publish = (fields: Record<string, unknown>) =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(doc(context.firestore(), 'user-location', ME), pin(fields))
	);

describe('user-location: what a level lets out', () => {
	it('publishes a country', () =>
		assertSucceeds(
			setDoc(doc(asMe(), 'user-location', ME), pin({ level: 'country' }))
		));

	it('refuses a city on a country-level pin', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'country', city: 'Budapest' })
			)
		));

	it('publishes a city without a name', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'city', city: 'Budapest' })
			)
		));

	it('refuses a name on a city-level pin', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'city', city: 'Budapest', displayName: 'Zsolt' })
			)
		));

	it('carries the name and the picture at profile level', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({
					level: 'profile',
					city: 'Budapest',
					displayName: 'Zsolt',
					photoURL: 'https://example.test/z.jpg',
				})
			)
		));

	it('refuses a level of its own making', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'everything' })
			)
		));

	it('refuses a field the map never asked for', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'country', email: 'me@example.test' })
			)
		));

	it('refuses something that is not a country code', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'country', countryCode: 'HUN' })
			)
		));

	it('refuses a city long enough to hold an address', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'city', city: 'x'.repeat(61) })
			)
		));
});

describe('user-location: whose pin it is', () => {
	it('refuses a pin written onto someone else', () =>
		assertFails(
			setDoc(
				doc(asStranger(), 'user-location', ME),
				pin({ level: 'country' })
			)
		));

	it('refuses a pin that names another collector', () =>
		assertFails(
			setDoc(
				doc(asMe(), 'user-location', ME),
				pin({ level: 'country', uid: SOMEONE_ELSE })
			)
		));
});

describe('user-location: who may see it', () => {
	it('shows a pin to a signed-in collector', async () => {
		await publish({ level: 'country' });

		await assertSucceeds(getDoc(doc(asStranger(), 'user-location', ME)));
	});

	it('keeps it from a visitor who is not signed in', async () => {
		await publish({ level: 'country' });

		await assertFails(getDoc(doc(asVisitor(), 'user-location', ME)));
	});
});

describe('user-location: taking it back', () => {
	it('lets the owner take their pin down', async () => {
		await publish({ level: 'country' });

		await assertSucceeds(deleteDoc(doc(asMe(), 'user-location', ME)));
	});

	it('refuses a stranger taking it down', async () => {
		await publish({ level: 'country' });

		await assertFails(deleteDoc(doc(asStranger(), 'user-location', ME)));
	});

	// The client deletes through FirestoreSyncService, which leaves a
	// tombstone for the other clients in the same batch. Without this the
	// withdrawal itself would fail.
	it('lets the owner leave the tombstone of their own pin', () =>
		assertSucceeds(
			setDoc(
				doc(
					asMe(),
					'sync',
					'user-location',
					'deletion',
					`user-location~${ME}`
				),
				{ path: `user-location/${ME}`, deletedAt: serverTimestamp() }
			)
		));

	it('refuses a tombstone for someone else', () =>
		assertFails(
			setDoc(
				doc(
					asStranger(),
					'sync',
					'user-location',
					'deletion',
					`user-location~${ME}`
				),
				{ path: `user-location/${ME}`, deletedAt: serverTimestamp() }
			)
		));
});

describe('user-location: the choice behind the pin', () => {
	it('keeps the sharing settings to their owner', async () => {
		await testEnv.withSecurityRulesDisabled((context) =>
			setDoc(
				doc(context.firestore(), 'user', ME, 'setting', 'location'),
				{ level: 'country', countryCode: 'HU', city: 'Budapest' }
			)
		);

		await assertSucceeds(
			getDoc(doc(asMe(), 'user', ME, 'setting', 'location'))
		);
		await assertFails(
			getDoc(doc(asStranger(), 'user', ME, 'setting', 'location'))
		);
	});
});
