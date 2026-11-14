#!/usr/bin/env node
/**
 * Takes the hand-written score off the collections.
 *
 *   node tools/sync/remove-collection-base-points.mjs [--env dev|prod]
 *     [--confirm]
 *
 * A collection used to carry a `basePoints` a curator could type in. Its
 * worth now follows from its size, the media and the rarity of the pressings
 * (docs/felhasznaloi/gyujtemeny-pontozas.md, REQ-SCORE-014), and nothing
 * reads the field any more — a definition also loses it the next time it is
 * saved. This removes what is left on the ones nobody saves.
 *
 * Without --confirm it only lists the collections that still carry a value.
 * Needs Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const COLLECTION = 'music-collection';
const FIELD = 'basePoints';
/** A Firestore batch holds 500 writes. */
const BATCH_SIZE = 400;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const database = getFirestore();
const carrying = (await database.collection(COLLECTION).get()).docs.filter(
	(document) => FIELD in document.data()
);

console.log(
	`${projectId}: ${carrying.length} collections still carry ${FIELD}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

for (const document of carrying) {
	console.log(
		`  ${document.id}  ${document.get('name')}  ${FIELD}=${document.get(FIELD)}`
	);
}

if (options.confirm && carrying.length) {
	for (let start = 0; start < carrying.length; start += BATCH_SIZE) {
		const batch = database.batch();

		for (const document of carrying.slice(start, start + BATCH_SIZE)) {
			batch.update(document.ref, stamp({ [FIELD]: FieldValue.delete() }));
		}

		await batch.commit();
	}

	await touchCatalog(database, [COLLECTION]);
	console.log(`${FIELD} removed, sync/catalog updated`);
}
