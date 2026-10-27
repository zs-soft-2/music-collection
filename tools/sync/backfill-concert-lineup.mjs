#!/usr/bin/env node
/**
 * Fills the bill of the concerts and the suggestions already filed, and puts
 * back an artist photo an edit dropped.
 *
 *   node tools/sync/backfill-concert-lineup.mjs [--env dev|prod] [--confirm]
 *
 * Two things are written, both of them from the catalog:
 *
 * - `lineup`: every act of the night, matched to the catalog by name, so the
 *   page can print the bands one by one and link the ones on the shelf. From
 *   now on the suggestion run (`suggestConcerts`) and the MusicBrainz load
 *   write it themselves; this is for what was filed before they did.
 * - `artistImageUrl`: an edit used to rebuild the whole document from the
 *   form, and the form has no field for the photo, so a corrected concert
 *   lost it. The repository no longer does that; the documents it already
 *   emptied are filled here.
 *
 * Nothing else is touched — the source, the mbids and the review state stay
 * as they are. Without --confirm it reads and prints what it would write.
 * Needs Firebase Admin credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { normalize } from '../discogs/discogs-mapping.mjs';
import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const CONCERT_COLLECTION = 'concert';
const SUGGESTION_COLLECTION = 'concert-suggestion';
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

/** The catalog's artists by normalised name, with the photo the page shows. */
async function readArtists() {
	const snapshot = await db
		.collection('artist')
		.select('name', 'imageUrl', 'discogs')
		.get();
	const byName = new Map();

	snapshot.forEach((document) => {
		const name = document.get('name') ?? '';

		if (!name) return;

		byName.set(normalize(name), {
			uid: document.id,
			name,
			imageUrl:
				document.get('imageUrl') ??
				document.get('discogs')?.imageUrl ??
				null,
		});
	});

	return byName;
}

/**
 * The bill of one night: the credited artist first, then the supporting acts
 * as the source wrote them, each one matched to the catalog by name.
 *
 * The title is not read for names. A seven-band night does write them into the
 * title, but so does a tour name, and a wrong name would be printed as a band
 * that plays that evening.
 */
function toLineup(data, byName) {
	const acts = [];
	const seen = new Set();

	for (const raw of [data.artistName, ...(data.supportingActs ?? [])]) {
		const name = String(raw ?? '').trim();
		const key = normalize(name);

		if (!name || seen.has(key)) continue;

		seen.add(key);

		const artist = byName.get(key);

		acts.push({
			name,
			artistUid: artist?.uid ?? null,
			imageUrl: artist?.imageUrl ?? null,
		});
	}

	return acts;
}

const same = (left = [], right = []) =>
	left.length === right.length &&
	left.every(
		(act, index) =>
			act.name === right[index].name &&
			(act.artistUid ?? null) === (right[index].artistUid ?? null) &&
			(act.imageUrl ?? null) === (right[index].imageUrl ?? null)
	);

const byName = await readArtists();
const pending = [];
let read = 0;

for (const collection of [CONCERT_COLLECTION, SUGGESTION_COLLECTION]) {
	const snapshot = await db.collection(collection).get();

	read += snapshot.size;

	snapshot.forEach((document) => {
		const data = document.data();
		const lineup = toLineup(data, byName);
		const fields = {};

		if (!same(data.lineup, lineup)) fields.lineup = lineup;

		// The photo of the credited artist, as the catalog holds it now.
		if (!data.artistImageUrl) {
			const artist = byName.get(normalize(data.artistName ?? ''));

			if (artist?.imageUrl) fields.artistImageUrl = artist.imageUrl;
		}

		if (Object.keys(fields).length) {
			pending.push({ ref: document.ref, fields, data });
		}
	});
}

console.log(
	`${projectId}: ${byName.size} artists, ${read} concerts and suggestions ` +
		`read, ${pending.length} to fill in` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

for (const { ref, fields, data } of pending) {
	const acts = (fields.lineup ?? data.lineup ?? [])
		.map((act) => (act.artistUid ? `▸${act.name}` : act.name))
		.join(' · ');

	console.log(
		`  ${ref.path}\n    ${acts || '—'}` +
			(fields.artistImageUrl ? '\n    + artist photo' : '')
	);
}

if (!pending.length || !options.confirm) {
	process.exit(0);
}

for (let from = 0; from < pending.length; from += BATCH_SIZE) {
	const batch = db.batch();

	pending
		.slice(from, from + BATCH_SIZE)
		.forEach(({ ref, fields }) => batch.update(ref, stamp(fields)));

	await batch.commit();
	console.log(
		`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${pending.length}`
	);
}

// Only the concerts are a catalog feature the clients sync; the suggestions
// are read by the admin page alone.
await touchCatalog(db, [CONCERT_COLLECTION]);
console.log('concert touched');
