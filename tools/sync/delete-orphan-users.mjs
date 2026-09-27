#!/usr/bin/env node
/**
 * Removes the `user` documents no Auth account stands behind.
 *
 *   node tools/sync/delete-orphan-users.mjs [--env dev|prod] [--confirm]
 *
 * The sign-in used to write the user document under a generated id, and asked
 * the local cache whether one was already there — a cache that had never seen
 * the collector says no. Every fresh browser profile therefore left another
 * document behind. Both are fixed (`UserDataServiceImpl.add$` writes under the
 * Auth uid, `loadExistedUser$` asks the server), and these are the leftovers:
 * nothing reads them, because everything — the collector's own copies, their
 * role, their permissions — is keyed by the uid.
 *
 * It deletes nothing that holds anything: a document with a subcollection
 * under it is kept and named instead. Deletions leave tombstones and bump the
 * feature's version, the way the app's own wrapper does, so the clients drop
 * them from their caches as well.
 *
 * Without --confirm it only prints what it would do. Needs Firebase Admin
 * credentials, and the Auth API needs a quota project:
 * `gcloud auth application-default set-quota-project music-collection-16676`.
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { tombstone, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const USER_COLLECTION = 'user';
/** Documents per batch: each one costs two writes, itself and its tombstone. */
const BATCH_SIZE = 200;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);
const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);

/**
 * Every Auth uid, read before anything else: this is what makes a document an
 * orphan, so a failure here must stop the script rather than condemn them all.
 */
const authUids = new Set();
let pageToken;

do {
	const page = await getAuth(app).listUsers(1000, pageToken);

	page.users.forEach((user) => authUids.add(user.uid));
	pageToken = page.pageToken;
} while (pageToken);

if (!authUids.size) {
	throw new Error('no Auth accounts — refusing to call anything an orphan');
}

const documents = await db.collection(USER_COLLECTION).get();
const orphans = [];
const kept = [];

for (const document of documents.docs) {
	if (authUids.has(document.id)) {
		continue;
	}

	const held = [];

	for (const subcollection of await document.ref.listCollections()) {
		const { count } = (await subcollection.count().get()).data();

		if (count) {
			held.push(`${subcollection.id}=${count}`);
		}
	}

	(held.length ? kept : orphans).push({ document, held });
}

console.log(
	`${projectId}: ${documents.size} user document(s), ` +
		`${authUids.size} Auth account(s), ${orphans.length} orphan(s)`
);

for (const { document } of orphans) {
	const data = document.data();

	console.log(
		`  delete ${document.id}  ${data.email ?? '(no email)'}  ` +
			`${data.displayName ?? ''}`
	);
}
for (const { document, held } of kept) {
	console.log(`  keep   ${document.id}  holds ${held.join(' ')}`);
}

if (!orphans.length) {
	console.log('nothing to delete');
	process.exit(0);
}
if (!options.confirm) {
	console.log(`DRY RUN — add --confirm to delete ${orphans.length}`);
	process.exit(0);
}

for (let index = 0; index < orphans.length; index += BATCH_SIZE) {
	const batch = db.batch();

	for (const { document } of orphans.slice(index, index + BATCH_SIZE)) {
		const stone = tombstone(db, document.ref);

		batch.delete(document.ref);
		batch.set(stone.ref, stone.data);
	}

	await batch.commit();
}

await touchCatalog(db, [USER_COLLECTION]);
console.log(
	`deleted ${orphans.length} document(s) with tombstones, ` +
		`${USER_COLLECTION} touched`
);
