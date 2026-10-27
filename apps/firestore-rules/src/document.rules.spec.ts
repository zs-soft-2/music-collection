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
	updateDoc,
} from 'firebase/firestore';

import { createTestEnvironment } from './test-environment';

const PATH = 'document/doc-1';
const ADMIN = 'admin-1';
const COLLECTOR = 'collector-1';

/** The dev bucket of `environment.ts` — the emulator runs under that project. */
const BUCKET = 'music-collection-16676.firebasestorage.app';
const ownFile = (name = 'document%2Fcover.png') =>
	`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${name}?alt=media&token=abc`;

/** What the document form writes once the file is up in Storage. */
const document = (fields: Record<string, unknown> = {}) => ({
	entityType: 'Document',
	filePath: ownFile(),
	fileType: 'image/png',
	name: 'Front cover',
	originalName: 'front.png',
	uid: 'doc-1',
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
					'createDocumentEntity',
					'updateDocumentEntity',
					'deleteDocumentEntity',
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
		await setDoc(doc(admin, PATH), document());
	});
});

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore();
const asVisitor = () => testEnv.unauthenticatedContext().firestore();

describe('document/{documentId}', () => {
	it('is readable by a visitor who has not signed in', () =>
		assertSucceeds(getDoc(doc(asVisitor(), PATH))));

	it('is written by whoever may edit documents', async () => {
		await assertSucceeds(
			setDoc(doc(as(ADMIN), 'document/doc-2'), document({ uid: 'doc-2' }))
		);
		await assertSucceeds(
			updateDoc(doc(as(ADMIN), PATH), { name: 'Back cover' })
		);
		await assertSucceeds(deleteDoc(doc(as(ADMIN), PATH)));
	});

	it('is not written by a collector', () =>
		assertFails(setDoc(doc(as(COLLECTOR), PATH), document())));

	/**
	 * The `filePath` is what the catalog pages load, and on the document page
	 * a PDF is loaded into a frame — which runs on the origin the address
	 * names, inside our own page. `firebasestorage.googleapis.com` is one
	 * host shared by every Firebase project, so the host says nothing about
	 * who uploaded the file; the bucket is what says it. Anyone can make a
	 * project and put a page in it.
	 */
	it('refuses a file in a bucket that is not ours', () =>
		assertFails(
			setDoc(
				doc(as(ADMIN), PATH),
				document({
					filePath: ownFile().replace(
						BUCKET,
						'attacker-project.appspot.com'
					),
				})
			)
		));

	it('refuses a bucket whose name merely begins with ours', () =>
		assertFails(
			setDoc(
				doc(as(ADMIN), PATH),
				document({
					filePath: ownFile().replace(
						BUCKET,
						`${BUCKET}.evil.example`
					),
				})
			)
		));

	it('refuses an address that is not our Storage at all', async () => {
		await assertFails(
			setDoc(
				doc(as(ADMIN), PATH),
				document({ filePath: 'https://evil.example/pretty.pdf' })
			)
		);
		await assertFails(
			setDoc(
				doc(as(ADMIN), PATH),
				document({ filePath: 'javascript:alert(1)' })
			)
		);
		await assertFails(
			setDoc(doc(as(ADMIN), PATH), document({ filePath: 42 }))
		);
	});

	/**
	 * The prod catalog was written years before this rule, so the address
	 * already in a document is left alone: an old record has to stay
	 * editable. What it may not do is take on a new foreign address.
	 */
	it('lets an address already in place stay, and refuses a new foreign one', async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await setDoc(
				doc(context.firestore(), PATH),
				document({ filePath: 'https://elsewhere.example/old.png' })
			);
		});

		await assertSucceeds(
			updateDoc(doc(as(ADMIN), PATH), { name: 'Renamed' })
		);
		await assertFails(
			updateDoc(doc(as(ADMIN), PATH), {
				filePath: 'https://evil.example/new.png',
			})
		);
		await assertSucceeds(
			updateDoc(doc(as(ADMIN), PATH), { filePath: ownFile() })
		);
	});
});
