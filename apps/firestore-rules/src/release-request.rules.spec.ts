import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
	deleteDoc,
	doc,
	getDoc,
	setDoc,
	updateDoc,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const SOMEBODY_ELSE = 'collector-2';
const ADMIN = 'admin-1';
const REQUEST = 'rr1';
const PATH = `release-request/${REQUEST}`;

/**
 * A request as the album page sends it: this album of the catalog, and the
 * pressing the collector picked off the Discogs versions.
 */
const request = (fields: Record<string, unknown> = {}) => ({
	uid: REQUEST,
	userId: ME,
	album: {
		uid: 'al1',
		name: 'Presence',
		artistUid: 'ar1',
		artistName: 'Led Zeppelin',
	},
	status: 'pending',
	discogsMasterId: 1234,
	discogsReleaseId: 5678,
	pressing: {
		format: 'Vinyl, LP, Album, Reissue',
		label: 'Swan Song',
		catno: 'SSK 59402',
		country: 'UK',
		year: 1976,
	},
	note: null,
	createdAt: 1,
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

		for (const uid of [ME, SOMEBODY_ELSE]) {
			await setDoc(
				doc(admin, `security/users/${uid}/effective_permissions`),
				{
					permissions: ['createCollectionItemEntity'],
					roles: ['USER'],
				}
			);
		}
		await setDoc(
			doc(admin, `security/users/${ADMIN}/effective_permissions`),
			{ permissions: ['ADMIN'], roles: ['ADMIN'] }
		);
	});
});

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asSomebodyElse = () =>
	testEnv.authenticatedContext(SOMEBODY_ELSE).firestore();
const asAdmin = () => testEnv.authenticatedContext(ADMIN).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

describe('release request: asking for a pressing', () => {
	it('lets a collector ask for a pressing of an album', () =>
		assertSucceeds(setDoc(doc(asMe(), PATH), request())));

	it('refuses an ask signed with somebody else name', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ userId: SOMEBODY_ELSE }))
		));

	it('refuses one that answers itself', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ status: 'approved' }))
		));

	it('keeps a visitor from asking at all', () =>
		assertFails(setDoc(doc(asVisitor(), PATH), request())));

	/**
	 * A record identified from a photo, which the catalog does not hold yet:
	 * the approval builds the album from the Discogs release, so there has to
	 * be one.
	 */
	it('takes an album the catalog does not have, with a Discogs release', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), PATH),
				request({
					album: {
						uid: null,
						name: 'Presence',
						artistUid: null,
						artistName: 'Led Zeppelin',
					},
				})
			)
		));

	it('refuses an album the catalog does not have and nothing to build it from', () =>
		assertFails(
			setDoc(
				doc(asMe(), PATH),
				request({
					album: {
						uid: null,
						name: 'Presence',
						artistUid: null,
						artistName: 'Led Zeppelin',
					},
					discogsReleaseId: null,
				})
			)
		));
});

/**
 * Every pending request is read together — by the collector on their own page
 * and by the admin on the decision list — so a request that fills the
 * megabyte a document holds is paid for at every opening. The rules bound
 * each free-text part of it.
 */
describe('release request: what one request may weigh', () => {
	it('takes a note of the collector own words', () =>
		assertSucceeds(
			setDoc(doc(asMe(), PATH), request({ note: 'Z'.repeat(500) }))
		));

	it('refuses a note that would fill the document', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ note: 'Z'.repeat(501) }))
		));

	it('refuses an album title with no bound', () =>
		assertFails(
			setDoc(
				doc(asMe(), PATH),
				request({
					album: {
						uid: 'al1',
						name: 'Z'.repeat(301),
						artistUid: 'ar1',
						artistName: 'Led Zeppelin',
					},
				})
			)
		));

	it('refuses a field smuggled into the album', () =>
		assertFails(
			setDoc(
				doc(asMe(), PATH),
				request({
					album: {
						uid: 'al1',
						name: 'Presence',
						artistUid: 'ar1',
						artistName: 'Led Zeppelin',
						sleeveNotes: 'Z'.repeat(5000),
					},
				})
			)
		));

	it('refuses a pressing described without end', () =>
		assertFails(
			setDoc(
				doc(asMe(), PATH),
				request({
					pressing: {
						format: 'Vinyl',
						label: 'Z'.repeat(201),
						catno: 'SSK 59402',
						country: 'UK',
						year: 1976,
					},
				})
			)
		));

	/** The shelf scan asks with what it read off the spine, and no pressing. */
	it('takes an ask that describes no pressing', () =>
		assertSucceeds(
			setDoc(doc(asMe(), PATH), request({ pressing: null }))
		));
});

describe('release request: who reads and who decides', () => {
	const givenTheRequest = () =>
		testEnv.withSecurityRulesDisabled((context) =>
			setDoc(doc(context.firestore(), PATH), request())
		);

	it('lets the collector read their own, and the admin all of them', async () => {
		await givenTheRequest();

		await assertSucceeds(getDoc(doc(asMe(), PATH)));
		await assertSucceeds(getDoc(doc(asAdmin(), PATH)));
	});

	it('keeps another collector from reading it', async () => {
		await givenTheRequest();

		await assertFails(getDoc(doc(asSomebodyElse(), PATH)));
	});

	it('leaves the decision to the admin', async () => {
		await givenTheRequest();

		await assertFails(
			updateDoc(doc(asMe(), PATH), { status: 'approved' })
		);
		await assertSucceeds(
			updateDoc(doc(asAdmin(), PATH), { status: 'approved' })
		);
	});

	it('lets the admin throw one away', async () => {
		await givenTheRequest();

		await assertFails(deleteDoc(doc(asMe(), PATH)));
		await assertSucceeds(deleteDoc(doc(asAdmin(), PATH)));
	});
});
