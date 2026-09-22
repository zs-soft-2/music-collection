#!/usr/bin/env node
/**
 * Files the badges drawn so far under their category.
 *
 *   node tools/catalog/mark-badge-documents.mjs [--env dev|prod] [--confirm]
 *
 * Every image a model draws for a collection gets a `document` over its file,
 * and since `badge-generation.ts` stamps `category: 'badge'` on it, the admin
 * list can keep the generated pins apart from what people upload by hand.
 * The ones drawn before that were filed without a category — this script
 * gives it to them, reading which documents the definitions point at
 * (`badge.gallery` and `badge.image`).
 *
 * Re-running is free: a document already carrying the category is left
 * alone. Writes go through the sync wrapper, so the clients' caches learn
 * about them. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { stamp, touchCatalog } from '../sync/catalog-sync.mjs';

const COLLECTION_FEATURE_KEY = 'music-collection';
const DOCUMENT_FEATURE_KEY = 'document';
/** `libs/api` DocumentCategoryEnum.Badge. */
const BADGE_CATEGORY = 'badge';
/** `getAll` takes them one by one; this keeps the batches sane. */
const BATCH_SIZE = 200;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
const definitions = await db.collection(COLLECTION_FEATURE_KEY).get();
const uids = new Set();

for (const definition of definitions.docs) {
	const badge = definition.get('badge') ?? {};

	for (const image of Array.isArray(badge.gallery) ? badge.gallery : []) {
		if (image?.documentUid) uids.add(image.documentUid);
	}

	if (badge.image?.documentUid) uids.add(badge.image.documentUid);
}

console.log(
	`${projectId}: ${definitions.size} collection(s), ` +
		`${uids.size} badge image(s)`
);

const pending = [];
const all = [...uids];

for (let index = 0; index < all.length; index += BATCH_SIZE) {
	const references = all
		.slice(index, index + BATCH_SIZE)
		.map((uid) => db.collection(DOCUMENT_FEATURE_KEY).doc(uid));
	const snapshots = await db.getAll(...references);

	for (const snapshot of snapshots) {
		if (!snapshot.exists) {
			console.log(`  missing ${snapshot.id}`);
			continue;
		}

		if (snapshot.get('category') === BADGE_CATEGORY) continue;

		pending.push(snapshot);
		console.log(`  mark    ${snapshot.id} — ${snapshot.get('name')}`);
	}
}

if (!pending.length) {
	console.log('nothing to write');
	process.exit(0);
}
if (!options.confirm) {
	console.log(`DRY RUN — ${pending.length} document(s); add --confirm`);
	process.exit(0);
}

const batch = db.batch();

for (const snapshot of pending) {
	batch.set(snapshot.ref, stamp({ category: BADGE_CATEGORY }), {
		merge: true,
	});
}

await batch.commit();
await touchCatalog(db, [DOCUMENT_FEATURE_KEY]);

console.log(`written ${pending.length}, ${DOCUMENT_FEATURE_KEY} touched`);
