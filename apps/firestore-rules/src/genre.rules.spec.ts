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
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const PATH = 'genre/rock';
const ADMIN = 'admin-1';
const COLLECTOR = 'collector-1';

/** What the admin page writes: the genre, plus the sync service's own stamp. */
const genre = (fields: Record<string, unknown> = {}) => ({
	active: true,
	description: 'Rock and everything that grew out of it.',
	entityType: 'Genre',
	name: 'Rock',
	slug: 'rock',
	styles: ['Thrash', 'Doom'],
	uid: 'rock',
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
					'createGenreEntity',
					'updateGenreEntity',
					'deleteGenreEntity',
				],
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
		await setDoc(doc(admin, PATH), genre());
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

describe('genre/{genreId}', () => {
	/**
	 * The taxonomy is what the catalog pages name a record's genre and styles
	 * from, so a visitor reads it like the rest of the catalog.
	 */
	it('is readable by a visitor who has not signed in', async () => {
		await assertSucceeds(getDoc(doc(asVisitor(), PATH)));
		await assertSucceeds(getDocs(collection(asVisitor(), 'genre')));
	});

	it('is written by whoever may edit the taxonomy', async () => {
		await assertSucceeds(
			setDoc(doc(as(ADMIN), 'genre/jazz'), genre({ name: 'Jazz', slug: 'jazz', uid: 'jazz' }))
		);
		await assertSucceeds(
			setDoc(doc(as(ADMIN), PATH), genre({ styles: ['Thrash'] }))
		);
		await assertSucceeds(deleteDoc(doc(as(ADMIN), PATH)));
	});

	it('is not written by a collector', async () => {
		await assertFails(setDoc(doc(as(COLLECTOR), PATH), genre()));
		await assertFails(deleteDoc(doc(as(COLLECTOR), PATH)));
	});

	it('is not written by a visitor', async () => {
		await assertFails(setDoc(doc(asVisitor(), PATH), genre()));
	});

	/**
	 * The shape is checked here rather than trusted from the form: this list
	 * is what every catalog form offers, and a genre without a name or with
	 * something other than a list of styles would break all of them at once.
	 */
	it('refuses a genre without a name', async () => {
		await assertFails(setDoc(doc(as(ADMIN), PATH), genre({ name: '' })));
		await assertFails(setDoc(doc(as(ADMIN), PATH), genre({ name: 7 })));
	});

	it('refuses a genre without a slug', async () => {
		await assertFails(setDoc(doc(as(ADMIN), PATH), genre({ slug: '' })));
	});

	it('refuses styles that are not a list', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), PATH), genre({ styles: 'Thrash' }))
		);
	});

	/** A hundred styles is a list; beyond that it is a dictionary. */
	it('refuses a style list longer than the forms can show', async () => {
		await assertFails(
			setDoc(
				doc(as(ADMIN), PATH),
				genre({
					styles: Array.from({ length: 101 }, (_, index) => `s${index}`),
				})
			)
		);
	});

	it('refuses a description longer than the page shows', async () => {
		await assertFails(
			setDoc(doc(as(ADMIN), PATH), genre({ description: 'x'.repeat(501) }))
		);
	});

	it('refuses an `active` flag that is not a flag', async () => {
		await assertFails(setDoc(doc(as(ADMIN), PATH), genre({ active: 'yes' })));
	});

	/**
	 * The tombstone the other clients learn a deletion from: the same
	 * permission writes it as deletes the genre.
	 */
	it('lets whoever deletes a genre leave its tombstone', async () => {
		await assertSucceeds(
			setDoc(doc(as(ADMIN), 'sync/genre/deletion/genre~rock'), {
				path: PATH,
				deletedAt: serverTimestamp(),
			})
		);
		await assertFails(
			setDoc(doc(as(COLLECTOR), 'sync/genre/deletion/genre~rock'), {
				path: PATH,
				deletedAt: serverTimestamp(),
			})
		);
	});
});
