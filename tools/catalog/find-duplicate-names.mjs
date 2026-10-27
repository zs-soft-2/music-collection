#!/usr/bin/env node
/**
 * Reports the artists and albums the catalog cannot tell apart.
 *
 *   node tools/catalog/find-duplicate-names.mjs [--env dev|prod]
 *
 * The same record reaches the catalog by two roads — an admin types it in,
 * or the Discogs import creates it as `discogs-{id}` — and nothing joins
 * them, so "Testament" and "Testament (2)" become two artists and the albums
 * beneath them two albums. An abstract collection resolved against that asks
 * for both, and the badge behind it can never be earned.
 *
 * Read-only: it writes nothing and merges nothing, because which of two
 * documents to keep is a judgement call. Run it before publishing a
 * collection. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { normalize } from '../discogs/discogs-mapping.mjs';
import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';

const { values: options } = parseArgs({ options: { env: ENV_OPTION } });
const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const database = getFirestore();

/** The groups that share a normalised name, largest first. */
function groupByName(items) {
	const groups = new Map();

	for (const item of items) {
		const key = normalize(item.name ?? '');

		if (key === '') continue;

		const group = groups.get(key);

		if (group) group.push(item);
		else groups.set(key, [item]);
	}

	return [...groups.values()]
		.filter((group) => group.length > 1)
		.sort((a, b) => b.length - a.length);
}

const describe = (item) =>
	`${item.name} (${item.uid}${item.source ? `, ${item.source}` : ''})`;

const artists = (await database.collection('artist').get()).docs.map((doc) => ({
	uid: doc.id,
	...doc.data(),
}));
// An album is a subcollection of its artist (`artist/{uid}/album`), so a
// top-level read finds nothing at all — hence the collection group.
const albums = (await database.collectionGroup('album').get()).docs.map(
	(doc) => ({ uid: doc.id, ...doc.data() })
);

console.log(
	`${projectId}: ${artists.length} artists, ${albums.length} albums\n`
);

const duplicateArtists = groupByName(artists);

console.log(
	`Artists the catalog cannot tell apart: ${duplicateArtists.length}`
);
for (const group of duplicateArtists) {
	console.log(`  ${group.map(describe).join('  |  ')}`);
}

// An album title only clashes within one artist: two bands may each have a
// record called Destroyer.
const byArtist = new Map();

for (const album of albums) {
	const artistUid = album.artist?.uid ?? '(no artist)';

	byArtist.set(artistUid, [...(byArtist.get(artistUid) ?? []), album]);
}

const duplicateAlbums = [...byArtist.entries()].flatMap(([artistUid, list]) =>
	groupByName(list).map((group) => ({ artistUid, group }))
);

console.log(`\nAlbums of one artist that clash: ${duplicateAlbums.length}`);
for (const { artistUid, group } of duplicateAlbums) {
	const artistName = group[0].artist?.name ?? artistUid;

	console.log(`  ${artistName}: ${group.map(describe).join('  |  ')}`);
}

if (duplicateArtists.length || duplicateAlbums.length) {
	console.log(
		'\nMerge these before publishing a collection: a record counted twice' +
			' inflates the total, and the badge can never be earned.'
	);
}
