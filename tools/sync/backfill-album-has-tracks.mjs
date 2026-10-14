#!/usr/bin/env node
/**
 * Writes `hasTracks` onto every album: whether the catalog holds the
 * album's own tracklist.
 *
 *   node tools/sync/backfill-album-has-tracks.mjs [--env dev|prod] [--confirm]
 *
 * The songs of an album are documents of their own in the `track`
 * collection, so an album carries nothing that says whether anybody has
 * written its tracklist yet — and the admin list, which is where that
 * question is asked, would have to download all of the tracks to work it
 * out. This writes the answer onto the album once, and the list reads it
 * for nothing.
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
 * Without --confirm it reads and prints what it would write. Every track
 * and every album is read once, the dry run included (about 10k reads on
 * the catalog as it stands). Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default
 * login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

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
// Only the two fields that decide it: the tracks carry pictures and clips,
// and the whole collection would be a download for nothing.
const tracks = await db
	.collection('track')
	.select('albumUid', 'releaseUid')
	.get();

const withTracks = new Set();

tracks.forEach((document) => {
	const { albumUid, releaseUid } = document.data();

	if (albumUid && !releaseUid) {
		withTracks.add(albumUid);
	}
});

// The albums live under their artist, so this is a collection group.
const albums = await db.collectionGroup('album').get();
const pending = [];
let agreed = 0;

albums.forEach((document) => {
	const hasTracks = withTracks.has(document.id);

	if (document.data().hasTracks === hasTracks) {
		agreed += 1;

		return;
	}

	pending.push({ ref: document.ref, hasTracks });
});

const missing = pending.filter((album) => !album.hasTracks);

console.log(
	`${projectId}: ${tracks.size} tracks and ${albums.size} albums read\n` +
		`  ${withTracks.size} albums have a tracklist of their own\n` +
		`  ${agreed} albums already say so\n` +
		`  ${pending.length} to be written, ${missing.length} of them as "no tracks"` +
		(options.confirm ? '' : '\n\nDRY RUN — add --confirm to write')
);

if (missing.length) {
	console.log('\n  without a tracklist:');
	missing.slice(0, 10).forEach(({ ref }) => console.log(`    ${ref.path}`));

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
