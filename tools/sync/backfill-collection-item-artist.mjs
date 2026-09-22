#!/usr/bin/env node
/**
 * Writes `artistSearchParameters` next to the collection items that were
 * saved before the admin list could be searched by artist.
 *
 *   node tools/sync/backfill-collection-item-artist.mjs [--env dev|prod]
 *     [--confirm]
 *
 * The app writes the field itself from then on (CollectionItemUtilService)
 * and so does the release request approval (apps/functions); this is only
 * for the documents already in the database. Without --confirm it reads and
 * prints what it would write. Every collection item is read once — a
 * collection of ten thousand copies is ten thousand reads, the dry run
 * included. Needs Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS
 * or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

/** Prefixes of the lower-case name, as the app's search expects. */
const searchPrefixes = (name) => {
	const lower = String(name ?? '').toLowerCase();

	return Array.from(lower, (_, index) => lower.slice(0, index + 1));
};

/** Firestore takes at most 500 writes in one batch. */
const BATCH_SIZE = 400;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
const snapshot = await db.collectionGroup('collection-item').get();
const same = (a = [], b = []) =>
	a.length === b.length && a.every((value, index) => value === b[index]);

const pending = [];

snapshot.forEach((document) => {
	const data = document.data();
	const name = data.release?.artist?.name ?? '';
	const prefixes = searchPrefixes(name);

	if (!same(data.artistSearchParameters, prefixes)) {
		pending.push({ ref: document.ref, name, prefixes });
	}
});

console.log(
	`${projectId}: ${snapshot.size} collection items read, ` +
		`${pending.length} to fill in` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

const nameless = pending.filter(({ name }) => !name);

if (nameless.length) {
	console.log(
		`  ${nameless.length} of them have no artist name; they get an ` +
			'empty list and stay unsearchable by artist:'
	);
	nameless
		.slice(0, 10)
		.forEach(({ ref }) => console.log(`    ${ref.path}`));
}

if (!pending.length || !options.confirm) {
	process.exit(0);
}

for (let from = 0; from < pending.length; from += BATCH_SIZE) {
	const batch = db.batch();

	pending
		.slice(from, from + BATCH_SIZE)
		.forEach(({ ref, prefixes }) =>
			batch.update(ref, stamp({ artistSearchParameters: prefixes }))
		);

	await batch.commit();
	console.log(`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${pending.length}`);
}

await touchCatalog(db, ['collection-item']);
console.log('collection-item touched');
