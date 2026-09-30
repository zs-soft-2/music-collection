import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const SOMEONE_ELSE = 'collector-2';
/** One document per day; the id is the day (`photo-scan-quota.ts`). */
const DAY = '2026-09-29';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await createTestEnvironment();
});

afterAll(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

const asMe = () => testEnv.authenticatedContext(ME).firestore();
const asStranger = () => testEnv.authenticatedContext(SOMEONE_ELSE).firestore();

const counter = (database: ReturnType<typeof asMe>, uid = ME) =>
	doc(database, 'user', uid, 'scan-quota', DAY);

/** The counter as the callable leaves it: the day is used up. */
const spent = () =>
	testEnv.withSecurityRulesDisabled((context) =>
		setDoc(counter(context.firestore() as never), {
			requests: 30,
			updatedAt: 1,
		})
	);

/**
 * The daily photo allowance. It is the callable's own bookkeeping: the whole
 * point is that the client cannot move it, otherwise a spent day would last
 * exactly until the next reload.
 */
describe('scan-quota: the collector', () => {
	it('sees how much of today they have used', async () => {
		await spent();

		await assertSucceeds(getDoc(counter(asMe())));
	});

	it('cannot start the day over', async () => {
		await spent();

		await assertFails(setDoc(counter(asMe()), { requests: 0 }));
	});

	it('cannot edit a single count', async () => {
		await spent();

		await assertFails(updateDoc(counter(asMe()), { requests: 1 }));
	});

	it('cannot throw the day away', async () => {
		await spent();

		await assertFails(deleteDoc(counter(asMe())));
	});

	it('cannot open one for themselves either', () =>
		assertFails(setDoc(counter(asMe()), { requests: 0 })));
});

describe('scan-quota: everybody else', () => {
	it('is not read by a stranger', async () => {
		await spent();

		await assertFails(getDoc(counter(asStranger(), ME)));
	});

	it('is not written by a stranger', () =>
		assertFails(setDoc(counter(asStranger(), ME), { requests: 0 })));
});
