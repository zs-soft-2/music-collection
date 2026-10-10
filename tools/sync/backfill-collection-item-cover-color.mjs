#!/usr/bin/env node
/**
 * Carries `release.coverColor` from the catalog onto the copies already on
 * somebody's shelf.
 *
 *   node tools/sync/backfill-collection-item-cover-color.mjs
 *     [--env dev|prod] [--confirm]
 *
 * A collection item keeps a copy of the release it is a copy of, taken when
 * the record was filed. That is what the shelf draws from, so a colour an
 * admin puts on a pressing today reaches nothing that was filed before —
 * every record in every collection would stay the colour the shelf makes up
 * from its title until its owner saved it again. This walks the copies over
 * and brings the colour with it.
 *
 * Without --confirm it reads and prints what it would write. Every release
 * and every collection item is read once, the dry run included. Needs
 * Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

/**
 * The one shape the shelf can draw with. It hands the value straight to CSS,
 * where anything else does not tint a spine wrong but takes the whole
 * declaration down — so the same gate the app writes through stands here.
 */
const HEX_COLOR = /^#[0-9a-f]{6}$/;

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
const releases = await db.collectionGroup('release').get();
const colorOf = new Map();

releases.forEach((document) => {
	const color = String(document.data().coverColor ?? '').toLowerCase();

	if (HEX_COLOR.test(color)) {
		colorOf.set(document.id, color);
	}
});

console.log(
	`${projectId}: ${releases.size} releases read, ` +
		`${colorOf.size} of them have a sleeve colour`
);

if (!colorOf.size) {
	console.log('nothing to carry over');
	process.exit(0);
}

const items = await db.collectionGroup('collection-item').get();
const pending = [];

items.forEach((document) => {
	const release = document.data().release;
	const color = colorOf.get(release?.uid) ?? null;

	// Only where the catalog knows better than the copy does. A colour the
	// copy already carries is left alone, and so is one the catalog has
	// nothing to say about: this fills gaps, it does not undo anything.
	if (color && release?.coverColor !== color) {
		pending.push({ ref: document.ref, color });
	}
});

console.log(
	`${items.size} collection items read, ${pending.length} to fill in` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

if (!pending.length || !options.confirm) {
	process.exit(0);
}

for (let from = 0; from < pending.length; from += BATCH_SIZE) {
	const batch = db.batch();

	pending
		.slice(from, from + BATCH_SIZE)
		.forEach(({ ref, color }) =>
			batch.update(ref, stamp({ 'release.coverColor': color }))
		);

	await batch.commit();
	console.log(
		`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${
			pending.length
		}`
	);
}

await touchCatalog(db, ['collection-item']);
console.log('collection-item touched');
