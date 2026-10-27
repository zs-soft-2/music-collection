#!/usr/bin/env node
/**
 * Writes `hasTracks` onto every album: whether the catalog holds the
 * album's own tracklist.
 *
 *   node tools/sync/backfill-album-has-tracks.mjs [--env dev|prod]
 *     [--read-all] [--catch-up] [--confirm]
 *
 * The songs of an album are documents of their own in the `track`
 * collection, so an album carries nothing that says whether anybody has
 * written its tracklist yet — and the admin list, which is where that
 * question is asked, would have to download all of the tracks to work it
 * out. This writes the answer onto the album once, and the list reads it
 * for nothing.
 *
 * Both collections are read from their published bundles (`bundle-reader`),
 * which is a Storage download and not a single document read; only what was
 * written or deleted after the bundles were built is asked of Firestore. So
 * a run costs a handful of reads, not ten thousand — but it is only as
 * current as the bundles are, and a stale one is caught up to, never
 * guessed at.
 *
 * Without a usable bundle — none published, one built before the last
 * reset, or one so far behind that catching up costs as much as reading
 * everything — it stops and says what to do: rebuild the bundles, or pass
 * `--read-all` / `--catch-up` to pay for the reads here. The dry run costs
 * the same as the real one, so it is not made cheap by leaving --confirm
 * off.
 *
 * What a pressing added (a track with a `releaseUid`) does not count: a
 * reissue's bonus cut is that edition's, not a line of the album's own
 * tracklist. `album.songs` does not count either — it is only what a
 * Discogs import once copied onto the album, and most of the catalog came
 * from elsewhere.
 *
 * The flag is a snapshot, not a promise: it is right until the next
 * tracklist is written, so run this again after an import or a spell of
 * filling lists in by hand.
 *
 * Without --confirm it reads and prints what it would write. Needs Firebase
 * Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth
 * application-default login`).
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

const read = {
	readAll: options['read-all'],
	catchUp: options['catch-up'] ? Infinity : undefined,
};
/** Reads the feature, or says in one line what to do about it and stops. */
async function feature(featureKey) {
	try {
		return await readFeatureDocuments(
			db,
			bucket,
			featureKey,
			catalog,
			read
		);
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}

const tracks = await feature('track');
const albums = await feature('album');
const withTracks = new Set();

for (const track of tracks.documents.values()) {
	if (track.albumUid && !track.releaseUid) {
		withTracks.add(track.albumUid);
	}
}

const pending = [];
let agreed = 0;

for (const [path, album] of albums.documents) {
	const hasTracks = withTracks.has(path.split('/').pop());

	if (album.hasTracks === hasTracks) {
		agreed += 1;
		continue;
	}

	pending.push({ ref: db.doc(path), hasTracks, path });
}

const missing = pending.filter((album) => !album.hasTracks);

console.log(
	`${projectId}: ${tracks.documents.size} tracks (${tracks.source}), ` +
		`${albums.documents.size} albums (${albums.source})\n` +
		// Document reads; the aggregations that size the deltas are a read
		// per thousand index entries and do not show up here.
		`  ${1 + tracks.reads + albums.reads} document read(s) to work it out\n` +
		`  ${withTracks.size} albums have a tracklist of their own\n` +
		`  ${agreed} albums already say so\n` +
		`  ${pending.length} to be written, ${missing.length} of them as "no tracks"` +
		(options.confirm ? '' : '\n\nDRY RUN — add --confirm to write')
);

if (missing.length) {
	console.log('\n  without a tracklist:');
	missing.slice(0, 10).forEach(({ path }) => console.log(`    ${path}`));

	if (missing.length > 10) {
		console.log(`    … and ${missing.length - 10} more`);
	}
}

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
		.forEach(({ ref, hasTracks }) =>
			batch.update(ref, stamp({ hasTracks }))
		);

	await batch.commit();
	console.log(
		`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${pending.length}`
	);
}

await touchCatalog(db, ['album']);
console.log('album touched');
