import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	collection,
	collectionGroup,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	where,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const SOMEBODY_ELSE = 'collector-2';
const PATH = `user/${ME}/wishlist-item/wish-1`;

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(async () => {
	await testEnv.clearFirestore();
	await testEnv.withSecurityRulesDisabled(async (context) => {
		const admin = context.firestore();

		await setDoc(doc(admin, PATH), {
			userReference: { uid: ME },
			albumReference: { uid: 'a1' },
		});
		await setDoc(doc(admin, `user/${SOMEBODY_ELSE}/wishlist-item/wish-9`), {
			userReference: { uid: SOMEBODY_ELSE },
			albumReference: { uid: 'a1' },
		});
	});
});

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asSomebodyElse = () =>
	testEnv.authenticatedContext(SOMEBODY_ELSE).firestore();
const asGuest = () => testEnv.unauthenticatedContext().firestore();

describe('wishlist-item: whose wantlist it is', () => {
	it('lets the collector read their own wish', () =>
		assertSucceeds(getDoc(doc(asMe(), PATH))));

	it('keeps another collector out of it', () =>
		assertFails(getDoc(doc(asSomebodyElse(), PATH))));

	it('keeps a visitor out of it', () =>
		assertFails(getDoc(doc(asGuest(), PATH))));

	it('lists the collector their own wantlist', () =>
		assertSucceeds(
			getDocs(collection(asMe(), `user/${ME}/wishlist-item`))
		));

	it('refuses another collector the whole wantlist', () =>
		assertFails(
			getDocs(collection(asSomebodyElse(), `user/${ME}/wishlist-item`))
		));

	// Everybody's wishes in one query: what the wish page used to ask for.
	it('refuses the whole tree to a signed-in collector', () =>
		assertFails(getDocs(collectionGroup(asMe(), 'wishlist-item'))));

	it('refuses the whole tree to a visitor', () =>
		assertFails(getDocs(collectionGroup(asGuest(), 'wishlist-item'))));

	it('gives a collection group narrowed to the collector themselves', () =>
		assertSucceeds(
			getDocs(
				query(
					collectionGroup(asMe(), 'wishlist-item'),
					where('userReference.uid', '==', ME)
				)
			)
		));

	it('refuses a collection group narrowed to somebody else', () =>
		assertFails(
			getDocs(
				query(
					collectionGroup(asMe(), 'wishlist-item'),
					where('userReference.uid', '==', SOMEBODY_ELSE)
				)
			)
		));
});
