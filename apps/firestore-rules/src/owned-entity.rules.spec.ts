import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	collectionGroup,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	setDoc,
	updateDoc,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const SOMEBODY_ELSE = 'collector-2';
const ARTIST = 'pozvakowski';
const PATH = `user/${ME}/owned-artist/${ARTIST}`;

/** An artist as the collector's own side of the catalog writes it. */
const band = (fields: Record<string, unknown> = {}) => ({
	entityType: 'Artist',
	name: 'Pozvakowski',
	meta: { ownerId: ME },
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

		await setDoc(doc(admin, `security/users/${ME}/effective_permissions`), {
			permissions: [
				'createOwnedArtistEntity',
				'updateOwnedArtistEntity',
				'deleteOwnedArtistEntity',
			],
			roles: ['USER'],
		});
		await setDoc(
			doc(admin, `security/users/${SOMEBODY_ELSE}/effective_permissions`),
			{
				permissions: ['createOwnedArtistEntity'],
				roles: ['USER'],
			}
		);
	});
});

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asSomebodyElse = () =>
	testEnv.authenticatedContext(SOMEBODY_ELSE).firestore();

const givenTheBand = () =>
	testEnv.withSecurityRulesDisabled(async (context) => {
		await setDoc(doc(context.firestore(), PATH), band());
	});

describe('owned entity: a band the catalog has never heard of', () => {
	it('lets the collector write one of their own', () =>
		assertSucceeds(setDoc(doc(asMe(), PATH), band())));

	it('lets them read it back', async () => {
		await givenTheBand();

		await assertSucceeds(getDoc(doc(asMe(), PATH)));
	});

	it('refuses one without the collector own permission', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(
				doc(
					context.firestore(),
					`security/users/${ME}/effective_permissions`
				),
				{ permissions: ['createArtistEntity'], roles: ['USER'] }
			);
		});

		await assertFails(setDoc(doc(asMe(), PATH), band()));
	});

	it('refuses a collection nobody named', () =>
		assertFails(setDoc(doc(asMe(), `user/${ME}/owned-hobby/h1`), band())));
});

describe('owned entity: the owner is the path, and stays', () => {
	it('refuses a band raised to the catalog by its own author', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), band({ meta: { ownerId: 'GLOBAL' } }))
		));

	it('refuses one signed with somebody else name', () =>
		assertFails(
			setDoc(
				doc(asMe(), PATH),
				band({ meta: { ownerId: SOMEBODY_ELSE } })
			)
		));

	it('refuses one with no owner at all', () =>
		assertFails(setDoc(doc(asMe(), PATH), band({ meta: null }))));

	it('refuses raising it to the catalog by an update', async () => {
		await givenTheBand();

		await assertFails(
			updateDoc(doc(asMe(), PATH), { meta: { ownerId: 'GLOBAL' } })
		);
	});

	it('lets the owner edit it as long as it stays theirs', async () => {
		await givenTheBand();

		await assertSucceeds(
			updateDoc(doc(asMe(), PATH), {
				name: 'Pozvakowski',
				meta: { ownerId: ME },
			})
		);
	});
});

describe('owned entity: nobody else', () => {
	beforeEach(givenTheBand);

	it('keeps another collector out of the document', () =>
		assertFails(getDoc(doc(asSomebodyElse(), PATH))));

	it('keeps another collector from writing into somebody else drawer', () =>
		assertFails(
			setDoc(
				doc(asSomebodyElse(), PATH),
				band({ meta: { ownerId: SOMEBODY_ELSE } })
			)
		));

	it('does not offer it to a group query, the way the catalog is offered', () =>
		assertFails(
			getDocs(collectionGroup(asSomebodyElse(), 'owned-artist'))
		));

	it('keeps it out of the catalog group query as well', () =>
		assertFails(getDocs(collectionGroup(asSomebodyElse(), 'owned-album'))));
});

describe('owned entity: letting one go', () => {
	beforeEach(givenTheBand);

	it('lets the owner delete it', () =>
		assertSucceeds(deleteDoc(doc(asMe(), PATH))));

	it('lets the owner leave the tombstone their other devices read', () =>
		assertSucceeds(
			setDoc(
				doc(
					asMe(),
					`sync/owned-artist/deletion/user~${ME}~owned-artist~${ARTIST}`
				),
				{ path: PATH, deletedAt: Date.now() }
			)
		));

	it('refuses a tombstone written in somebody else name', () =>
		assertFails(
			setDoc(
				doc(
					asMe(),
					`sync/owned-artist/deletion/user~${SOMEBODY_ELSE}~owned-artist~${ARTIST}`
				),
				{ path: PATH, deletedAt: Date.now() }
			)
		));

	it('refuses the delete without the permission', () =>
		assertFails(deleteDoc(doc(asSomebodyElse(), PATH))));
});
