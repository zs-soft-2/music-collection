import {
	RulesTestEnvironment,
	assertFails,
	assertSucceeds,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const ME = 'collector-1';
const SOMEBODY_ELSE = 'collector-2';
const ADMIN = 'admin-1';
const REQUEST = 'r1';
const PATH = `entity-request/${REQUEST}`;
const RESPONSE_PATH = 'entity-response/p1';

/** A request as the collector's page sends it: a band of their own. */
const request = (fields: Record<string, unknown> = {}) => ({
	uid: REQUEST,
	userId: ME,
	operation: 'create',
	target: {
		featureKey: 'artist',
		entityType: 'Artist',
		path: null,
		parentPath: null,
		ownedPath: `user/${ME}/owned-artist/a1`,
	},
	before: null,
	after: { name: 'Pozvakowski' },
	changes: [
		{ field: 'name', before: null, after: 'Pozvakowski', reference: null },
	],
	status: 'pending',
	baseUpdatedAt: null,
	note: null,
	createdAt: 1,
	...fields,
});

const changes = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		field: `f${index}`,
		before: null,
		after: 'x',
		reference: null,
	}));

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
			permissions: ['createOwnedArtistEntity'],
			roles: ['USER'],
		});
		await setDoc(
			doc(admin, `security/users/${SOMEBODY_ELSE}/effective_permissions`),
			{ permissions: ['createOwnedArtistEntity'], roles: ['USER'] }
		);
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

const givenTheRequest = (fields: Record<string, unknown> = {}) =>
	testEnv.withSecurityRulesDisabled(async (context) => {
		await setDoc(doc(context.firestore(), PATH), request(fields));
	});

describe('entity request: asking the catalog to take something in', () => {
	it('lets a collector ask for what they may enter for themselves', () =>
		assertSucceeds(setDoc(doc(asMe(), PATH), request())));

	it('refuses the ask without the permission to own such an entity', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(
				doc(
					context.firestore(),
					`security/users/${ME}/effective_permissions`
				),
				{ permissions: ['createArtistEntity'], roles: ['USER'] }
			);
		});

		await assertFails(setDoc(doc(asMe(), PATH), request()));
	});

	it('refuses an ask signed with somebody else name', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ userId: SOMEBODY_ELSE }))
		));

	it('refuses one that answers itself', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ status: 'approved' }))
		));

	it('refuses one carrying a decision of its own', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ decidedBy: ME, decidedAt: 2 }))
		));

	it('refuses an id that is not the document it is in', () =>
		assertFails(setDoc(doc(asMe(), PATH), request({ uid: 'other' }))));

	it('refuses a kind of entity nobody named', () =>
		assertFails(
			setDoc(
				doc(asMe(), PATH),
				request({
					target: {
						featureKey: 'hobby',
						entityType: 'Hobby',
						path: null,
						parentPath: null,
						ownedPath: null,
					},
				})
			)
		));

	it('refuses an ask about nothing', () =>
		assertFails(setDoc(doc(asMe(), PATH), request({ changes: [] }))));

	it('refuses one too long to decide on', () =>
		assertFails(
			setDoc(doc(asMe(), PATH), request({ changes: changes(41) }))
		));

	it('takes one as long as it stays within the bound', () =>
		assertSucceeds(
			setDoc(doc(asMe(), PATH), request({ changes: changes(40) }))
		));

	it('refuses an operation that is neither', () =>
		assertFails(setDoc(doc(asMe(), PATH), request({ operation: 'drop' }))));

	it('keeps a visitor from asking at all', () =>
		assertFails(setDoc(doc(asVisitor(), PATH), request())));

	it('takes a change to something the catalog already holds', () =>
		assertSucceeds(
			setDoc(
				doc(asMe(), PATH),
				request({
					operation: 'update',
					target: {
						featureKey: 'artist',
						entityType: 'Artist',
						path: 'artist/a1',
						parentPath: null,
						ownedPath: null,
					},
					before: { name: 'Pozvakowski', country: 'Hungary' },
					after: { name: 'Pozvakowski', country: 'Germany' },
					changes: [
						{
							field: 'country',
							before: 'Hungary',
							after: 'Germany',
							reference: {
								kind: 'url',
								value: 'https://one.test',
							},
						},
					],
					baseUpdatedAt: 17,
				})
			)
		));
});

describe('entity request: once it is sent', () => {
	beforeEach(() => givenTheRequest());

	it('lets the collector read their own', () =>
		assertSucceeds(getDoc(doc(asMe(), PATH))));

	it('keeps another collector out of it', () =>
		assertFails(getDoc(doc(asSomebodyElse(), PATH))));

	it('lets an admin read it', () =>
		assertSucceeds(getDoc(doc(asAdmin(), PATH))));

	it('refuses the author changing what is being decided on', () =>
		assertFails(updateDoc(doc(asMe(), PATH), { note: 'one more thing' })));

	it('refuses an admin deciding it by hand — that is the callable job', () =>
		assertFails(updateDoc(doc(asAdmin(), PATH), { status: 'approved' })));

	it('refuses the author withdrawing it by deleting it', () =>
		assertFails(deleteDoc(doc(asMe(), PATH))));

	it('lets an admin delete it', () =>
		assertSucceeds(deleteDoc(doc(asAdmin(), PATH))));
});

describe('entity response: the answer', () => {
	beforeEach(() =>
		testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(doc(context.firestore(), RESPONSE_PATH), {
				uid: 'p1',
				requestUid: REQUEST,
				userId: ME,
				status: 'partially-approved',
				verdicts: [{ field: 'name', kind: 'accepted', reason: null }],
				adminNote: null,
				appliedPath: 'artist/a1',
				appliedFields: ['name'],
				decidedBy: ADMIN,
				decidedAt: 2,
			});
		})
	);

	it('is read by the collector it was written for', () =>
		assertSucceeds(getDoc(doc(asMe(), RESPONSE_PATH))));

	it('is not read by anybody else', () =>
		assertFails(getDoc(doc(asSomebodyElse(), RESPONSE_PATH))));

	it('is read by an admin', () =>
		assertSucceeds(getDoc(doc(asAdmin(), RESPONSE_PATH))));

	it('is written by nobody from the client, admin included', () =>
		assertFails(
			updateDoc(doc(asAdmin(), RESPONSE_PATH), { adminNote: 'hm' })
		));
});
