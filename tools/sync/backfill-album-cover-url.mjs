#!/usr/bin/env node
/**
 * Carries each album's entered cover address onto the copies of the album
 * that other records keep.
 *
 *   node tools/sync/backfill-album-cover-url.mjs
 *     [--env dev|prod] [--read-all] [--catch-up] [--confirm]
 *
 * Three records keep a copy of the album instead of reading it: a wish
 * (`albumReference`), a pressing (`album`) and a copy on a shelf
 * (`release.album`). The surfaces that show them draw the cover from that
 * copy, so an address entered on the album reaches none of the copies made
 * before it — a wish stored before #79 had no place for it at all. This
 * walks the copies over and brings the address with it.
 *
 * It fills gaps and never undoes anything: where the album has no address
 * nothing is written, so an address is never blanked, and a copy that
 * already holds the album's address is left alone — a second run writes
 * nothing.
 *
 * The albums come from the published bundle (one read for `sync/catalog`
 * plus the documents written since), every wish, pressing and copy is read
 * once. The dry run reads the same. Without --confirm it only prints what it
 * would write. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default
 * login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import { readFeatureDocuments } from './bundle-reader.mjs';
import {
	CATALOG_SYNC_DOCUMENT,
	SYNC_COLLECTION,
	stamp,
	touchCatalog,
} from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

/** Firestore takes at most 500 writes in one batch. */
const BATCH_SIZE = 400;

/**
 * The records that keep a copy of the album: where the copy names its
 * album, and the field the address goes to.
 */
const TARGETS = [
	{
		featureKey: 'wishlist-item',
		albumUid: (data) => data.albumReference?.uid,
		address: (data) => data.albumReference?.coverImageUrl,
		field: 'albumReference.coverImageUrl',
	},
	{
		featureKey: 'release',
		albumUid: (data) => data.album?.uid,
		address: (data) => data.album?.coverImageUrl,
		field: 'album.coverImageUrl',
	},
	{
		featureKey: 'collection-item',
		albumUid: (data) => data.release?.album?.uid,
		address: (data) => data.release?.album?.coverImageUrl,
		field: 'release.album.coverImageUrl',
	},
];

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		'read-all': { type: 'boolean', default: false },
		'catch-up': { type: 'boolean', default: false },
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId, storageBucket } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId, storageBucket });

const db = getFirestore();
const bucket = getStorage().bucket();
// The one read every run pays: where the bundles are and how old they are.
const catalog = await db
	.collection(SYNC_COLLECTION)
	.doc(CATALOG_SYNC_DOCUMENT)
	.get();

let albums;

try {
	albums = await readFeatureDocuments(db, bucket, 'album', catalog, {
		readAll: options['read-all'],
		catchUp: options['catch-up'] ? Infinity : undefined,
	});
} catch (error) {
	console.error(error.message);
	process.exit(1);
}

/** Album uid → its entered address, for the albums that have one. */
const addressOf = new Map();
const albumUids = new Set();

for (const [path, album] of albums.documents) {
	const uid = path.split('/').pop();
	// A cleared input stores '' and a stray space is not a picture: the
	// readers treat both as absent, so they carry nothing over either.
	const address = String(album.coverImageUrl ?? '').trim();

	albumUids.add(uid);

	if (address) {
		addressOf.set(uid, address);
	}
}

console.log(
	`${projectId}: ${albums.documents.size} albums (${albums.source}), ` +
		`${addressOf.size} of them have an entered cover address`
);

const pending = [];
let reads = 1 + albums.reads;

for (const target of TARGETS) {
	const snapshot = await db.collectionGroup(target.featureKey).get();
	const missing = [];
	let filled = 0;

	reads += snapshot.size;

	snapshot.forEach((document) => {
		const data = document.data();
		const albumUid = target.albumUid(data);

		if (!albumUid || !albumUids.has(albumUid)) {
			missing.push(document.ref.path);
			return;
		}

		const address = addressOf.get(albumUid);

		// Only where the album knows better than the copy does.
		if (address && target.address(data) !== address) {
			pending.push({ ref: document.ref, target, address });
			filled += 1;
		}
	});

	console.log(
		`  ${target.featureKey}: ${snapshot.size} read, ${filled} to fill in`
	);

	if (missing.length) {
		console.log(`    ${missing.length} name an album the catalog lacks:`);
		missing.slice(0, 10).forEach((path) => console.log(`      ${path}`));

		if (missing.length > 10) {
			console.log(`      … and ${missing.length - 10} more`);
		}
	}
}

console.log(
	`  ${reads} document read(s), ${pending.length} to be written` +
		(options.confirm ? '' : '\n\nDRY RUN — add --confirm to write')
);

if (!options.confirm) {
	process.exit(0);
}

if (!pending.length) {
	console.log('\nnothing to write');
	process.exit(0);
}

for (let from = 0; from < pending.length; from += BATCH_SIZE) {
	const batch = db.batch();

	pending
		.slice(from, from + BATCH_SIZE)
		.forEach(({ ref, target, address }) =>
			batch.update(ref, stamp({ [target.field]: address }))
		);

	await batch.commit();
	console.log(
		`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${pending.length}`
	);
}

const written = [...new Set(pending.map(({ target }) => target.featureKey))];

await touchCatalog(db, written);
console.log(`${written.join(', ')} touched`);
