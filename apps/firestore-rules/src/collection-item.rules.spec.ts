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
