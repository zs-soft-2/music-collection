import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const ITEM = 'copy-1';
const PATH = `user/${ME}/collection-item/${ITEM}`;

/** A place on the drawn shelf, as the picker writes it. */
const spot = (fields: Record<string, unknown> = {}) => ({
	unitId: 'shelf-1',
	row: 2,
	column: 3,
	position: 4,
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
				'createCollectionItemEntity',
				'updateCollectionItemEntity',
			],
			roles: ['collector'],
		});
		await setDoc(doc(admin, PATH), { userId: ME, release: { uid: 'r1' } });
	});
});

const asMe = () => testEnv.authenticatedContext(ME).firestore();

describe('collection-item: where the collector filed the copy', () => {
	it('files a copy into a compartment', () =>
		assertSucceeds(updateDoc(doc(asMe(), PATH), { placement: spot() })));

	it('takes the place back', () =>
		assertSucceeds(updateDoc(doc(asMe(), PATH), { placement: null })));

	it('refuses a compartment outside any furniture that can be drawn', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), { placement: spot({ row: 13 }) })
		));

	it('refuses a place that is not counted from one', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), { placement: spot({ column: 0 }) })
		));

	it('refuses a position past what a compartment holds', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), { placement: spot({ position: 37 }) })
		));

	it('refuses a place with nothing to stand in', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), { placement: spot({ unitId: '' }) })
		));

	it('refuses anything else smuggled into the place', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				placement: spot({ note: 'behind the sofa' }),
			})
		));

	it('refuses a copy created with a place that is not one', () =>
		assertFails(
			setDoc(doc(asMe(), `user/${ME}/collection-item/copy-2`), {
				userId: ME,
				release: { uid: 'r2' },
				placement: spot({ position: 0 }),
			})
		));
});

/** A picture of the copy, as the page writes it. */
const photo = (fields: Record<string, unknown> = {}) => ({
	path: `collection-item/${ME}/${ITEM}/front-1758499200000.jpg`,
	url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/front.jpg',
	width: 2000,
	height: 1994,
	...fields,
});

describe('collection-item: what the collector tells about the copy', () => {
	it('writes when, where and for how much', () =>
		assertSucceeds(
			updateDoc(doc(asMe(), PATH), {
				purchase: {
					date: 1550000000000,
					place: 'Lemezkuckó',
					price: 4500,
					currency: 'HUF',
				},
			})
		));

	it('writes a purchase that is only a place', () =>
		assertSucceeds(
			updateDoc(doc(asMe(), PATH), {
				purchase: {
					date: null,
					place: 'A gift',
					price: null,
					currency: null,
				},
			})
		));

	it('clears the purchase', () =>
		assertSucceeds(updateDoc(doc(asMe(), PATH), { purchase: null })));

	it('refuses a price that is owed rather than paid', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				purchase: {
					date: null,
					place: null,
					price: -1,
					currency: 'HUF',
				},
			})
		));

	it('refuses a currency that is not a code', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				purchase: {
					date: null,
					place: null,
					price: 10,
					currency: 'forint',
				},
			})
		));

	it('refuses anything smuggled into the purchase', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				purchase: {
					date: null,
					place: null,
					price: null,
					currency: null,
					seller: 'someone',
				},
			})
		));

	it('grades the record and the sleeve apart', () =>
		assertSucceeds(
			updateDoc(doc(asMe(), PATH), {
				condition: { media: 'NM', sleeve: 'VG+' },
			})
		));

	it('refuses a grade off the scale', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				condition: { media: 'A+', sleeve: null },
			})
		));

	it('writes the story', () =>
		assertSucceeds(
			updateDoc(doc(asMe(), PATH), {
				story: 'Found it in a bin in Szeged, the sleeve still damp.',
			})
		));

	it('refuses a story that would crowd out the record', () =>
		assertFails(updateDoc(doc(asMe(), PATH), { story: 'x'.repeat(5001) })));

	it('writes a front and a back', () =>
		assertSucceeds(
			updateDoc(doc(asMe(), PATH), {
				photos: [
					photo(),
					photo({
						path: `collection-item/${ME}/${ITEM}/back-1758499300000.jpg`,
					}),
				],
			})
		));

	it('clears the photos', () =>
		assertSucceeds(updateDoc(doc(asMe(), PATH), { photos: [] })));

	it('refuses a third picture', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				photos: [photo(), photo(), photo()],
			})
		));

	it('refuses a picture filed under another collector', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				photos: [
					photo({
						path: 'collection-item/collector-2/copy-9/front.jpg',
					}),
				],
			})
		));

	it('refuses a picture filed under another copy of mine', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				photos: [
					photo({
						path: `collection-item/${ME}/copy-9/front.jpg`,
					}),
				],
			})
		));

	it('refuses a picture that is not one', () =>
		assertFails(
			updateDoc(doc(asMe(), PATH), {
				photos: [photo({ width: 0 })],
			})
		));
});
