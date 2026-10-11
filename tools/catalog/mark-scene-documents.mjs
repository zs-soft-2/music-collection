#!/usr/bin/env node
/**
 * Files the backdrops drawn so far under their category.
 *
 *   node tools/catalog/mark-scene-documents.mjs [--env dev|prod] [--confirm]
 *
 * The scene bench in the collection editor keeps only the picture somebody
 * says to keep, and files a `document` over it. Since the editor now stamps
 * `category: 'scene'` on that document, the admin list and the pickers can
 * tell a backdrop from an album cover. The ones kept before that were filed
 * without a category — this script gives it to them.
 *
 * Which ones are they: the bench names what it keeps `jelenet-<zár>-<idő>`,
 * so a prefix range over `name` finds them without reading the whole
 * library. Beside them, whatever a collection points at as its cover: that
 * picture is this collection's backdrop whoever made it, and since the
 * editor's picker now offers backdrops only, one left unfiled would be a
 * picture nobody could find again.
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
/** `libs/api` DocumentCategoryEnum.Scene. */
const SCENE_CATEGORY = 'scene';
/** What `scene-generator.store.ts` names a kept picture. */
const NAME_PREFIX = 'jelenet-';
/** A fél-nyílt tartomány vége: a kötőjel utáni karakter. */
const NAME_END = 'jelenet.';
/** Amennyi értéket egy `in` lekérdezés elbír. */
const IN_LIMIT = 30;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
const found = new Map();

const bench = await db
	.collection(DOCUMENT_FEATURE_KEY)
	.where('name', '>=', NAME_PREFIX)
	.where('name', '<', NAME_END)
	.get();

for (const snapshot of bench.docs) found.set(snapshot.id, snapshot);

// A definíciók csak a kép címét tárolják, nem a dokumentum azonosítóját,
// ezért a `filePath` felől kell visszakeresni — harmincasával, amennyit egy
// `in` lekérdezés elbír.
const definitions = await db.collection(COLLECTION_FEATURE_KEY).get();
const covers = [
	...new Set(
		definitions.docs
			.map((definition) => definition.get('coverImageUrl'))
			.filter((url) => typeof url === 'string' && url)
	),
];

for (let index = 0; index < covers.length; index += IN_LIMIT) {
	const slice = covers.slice(index, index + IN_LIMIT);
	const matches = await db
		.collection(DOCUMENT_FEATURE_KEY)
		.where('filePath', 'in', slice)
		.get();

	for (const snapshot of matches.docs) found.set(snapshot.id, snapshot);
}

console.log(
	`${projectId}: ${bench.size} bench picture(s), ` +
		`${covers.length} cover(s) in use, ${found.size} document(s)`
);

const pending = [...found.values()].filter((snapshot) => {
	if (snapshot.get('category') === SCENE_CATEGORY) return false;

	console.log(`  mark    ${snapshot.id} — ${snapshot.get('name')}`);

	return true;
});

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
	batch.set(snapshot.ref, stamp({ category: SCENE_CATEGORY }), {
		merge: true,
	});
}

await batch.commit();
await touchCatalog(db, [DOCUMENT_FEATURE_KEY]);

console.log(`written ${pending.length}, ${DOCUMENT_FEATURE_KEY} touched`);
