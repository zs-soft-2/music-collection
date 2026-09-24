import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const PATH = 'app-setting/language';
const ADMIN = 'admin-1';
const COLLECTOR = 'collector-1';

/** What the app writes: the language, plus the sync service's own stamp. */
const setting = (language = 'hu') => ({
	language,
	updatedAt: serverTimestamp(),
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
				permissions: ['updateDefaultLanguage'],
				roles: ['admin'],
			}
		);
		await setDoc(
			doc(admin, `security/users/${COLLECTOR}/effective_permissions`),
			{
				permissions: ['createCollectionItemEntity'],
				roles: ['collector'],
			}
		);
		await setDoc(doc(admin, PATH), { language: 'en' });
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

describe('app-setting/language', () => {
	/**
	 * The one document in `app-setting` a visitor may read, and it has to be:
	 * it decides what language the page opens in, and a visitor is exactly
	 * the reader who has picked nothing.
	 */
	it('is readable by a visitor who has not signed in', async () => {
		await assertSucceeds(getDoc(doc(asVisitor(), PATH)));
	});

	it('is readable by a signed-in collector', async () => {
		await assertSucceeds(getDoc(doc(as(COLLECTOR), PATH)));
	});

	it('is written by whoever may set the default', async () => {
		await assertSucceeds(setDoc(doc(as(ADMIN), PATH), setting()));
	});

	it('is not written by a collector', async () => {
		await assertFails(setDoc(doc(as(COLLECTOR), PATH), setting()));
	});

	it('is not written by a visitor', async () => {
		await assertFails(setDoc(doc(asVisitor(), PATH), setting()));
	});

	/**
	 * A language the app does not speak would leave every reader who has not
	 * picked looking at key names, so the rule refuses it rather than trusting
	 * the form that sent it.
	 */
	it('refuses a language the app does not speak', async () => {
		await assertFails(setDoc(doc(as(ADMIN), PATH), setting('fr')));
	});

	it('refuses a field that has no business here', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), PATH), {
				...setting(),
				permissions: ['ADMIN'],
			})
		);
	});

	/** The rest of `app-setting` stays admin-only; this is the exception. */
	it('does not open the other app settings to a visitor', async () => {
		await assertFails(
			getDoc(doc(asVisitor(), 'app-setting/badge-generation'))
		);
	});
});
