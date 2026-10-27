#!/usr/bin/env node
/**
 * Writes `catno` — the label's catalog number — onto the releases that were
 * imported before the field existed.
 *
 *   node tools/sync/backfill-release-catno.mjs [--env dev|prod]
 *     [--limit N] [--confirm]
 *
 * The number printed on a spine or a back cover is what a shelf photo can be
 * read for, so it is the key that matches a scanned record to the catalog
 * without asking Discogs. New imports get it from `toCatalogRelease`
 * (apps/functions/src/discogs-release.ts); this is only for what is already
 * in the database.
 *
 * Two sources, in this order:
 * 1. the album embedded in the release document, when it was imported from
 *    the same Discogs pressing — free, no request,
 * 2. `/releases/{id}` on Discogs — one request per release, and Discogs
 *    allows 60 a minute with a token, so this is the slow part. `--limit`
 *    caps it for a first run.
 *
 * Without --confirm it reads and prints what it would write. Every release is
 * read once, the dry run included. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`)
 * and, for the Discogs source, DISCOGS_TOKEN.
 *
 * After a large run rebuild the bundles (tools/sync/build-bundles.mjs), so
 * the clients take one file instead of thousands of deltas.
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { DiscogsClient } from '../discogs/discogs-client.mjs';
import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

/** Firestore takes at most 500 writes in one batch. */
const BATCH_SIZE = 400;

const text = (value) => {
	const trimmed = String(value ?? '').trim();

	return trimmed || null;
};

/**
 * The Discogs spells a missing catalog number out instead of leaving it
 * empty. Stored, every one of those would normalize to the same value, and
 * from then on any two numberless pressings would look like a match. The
 * same list lives in apps/functions/src/discogs-release.ts.
 */
const NO_CATNO = ['none', 'not on label', 'n/a', '-'];

/** The printed catalog number, or null when there is none to store. */
const catalogNumber = (value) => {
	const catno = text(value);

	return catno && !NO_CATNO.includes(catno.toLowerCase()) ? catno : null;
};

/**
 * The catalog number the release document already carries in its embedded
 * album — only when that album came from this very pressing, otherwise the
 * number belongs to a different edition.
 */
function catnoFromAlbum(data) {
	const discogs = data.album?.discogs;

	if (!discogs || discogs.releaseId !== data.discogsReleaseId) return null;

	return catalogNumber(discogs.labels?.[0]?.catno);
}

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		limit: { type: 'string' },
		confirm: { type: 'boolean', default: false },
	},
});

const limit = options.limit ? Number(options.limit) : Infinity;

if (Number.isNaN(limit) || limit <= 0) {
	throw new Error(`--limit must be a positive number: ${options.limit}`);
}

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
// The releases live under their album, so this is a collection group. No
// `where` on it on purpose: a filtered collection-group query needs an index
// deployed first, and filtering here costs nothing but memory.
const snapshot = await db.collectionGroup('release').get();

const filled = [];
const junk = [];
const fromAlbum = [];
const fromDiscogs = [];
const unfillable = [];

snapshot.forEach((document) => {
	const data = document.data();

	if (catalogNumber(data.catno)) {
		filled.push(document.ref);

		return;
	}

	// Written before the placeholders above were recognised: clear it, so it
	// cannot match another numberless pressing.
	if (text(data.catno)) {
		junk.push({ ref: document.ref, catno: null, had: text(data.catno) });

		return;
	}

	const embedded = catnoFromAlbum(data);

	if (embedded) {
		fromAlbum.push({ ref: document.ref, catno: embedded });

		return;
	}

	if (data.discogsReleaseId) {
		fromDiscogs.push({
			ref: document.ref,
			discogsReleaseId: data.discogsReleaseId,
			name: data.name ?? '(no name)',
		});

		return;
	}

	unfillable.push({ ref: document.ref, name: data.name ?? '(no name)' });
});

const planned = Math.min(fromDiscogs.length, limit);
const minutes = Math.ceil((planned * 1.1) / 60);

console.log(
	`${projectId}: ${snapshot.size} releases read\n` +
		`  ${filled.length} already have a catalog number\n` +
		(junk.length
			? `  ${junk.length} hold a placeholder to be cleared\n`
			: '') +
		`  ${fromAlbum.length} can be filled from the embedded album (free)\n` +
		`  ${fromDiscogs.length} need a Discogs request` +
		(planned < fromDiscogs.length ? `, ${planned} of them this run` : '') +
		(planned ? ` — about ${minutes} minute(s)` : '') +
		'\n' +
		`  ${unfillable.length} have no Discogs id and stay empty` +
		(options.confirm ? '' : '\n\nDRY RUN — add --confirm to write')
);

if (unfillable.length) {
	console.log('\n  without a Discogs id:');
	unfillable
		.slice(0, 10)
		.forEach(({ ref, name }) => console.log(`    ${name} — ${ref.path}`));

	if (unfillable.length > 10) {
		console.log(`    … and ${unfillable.length - 10} more`);
	}
}

if (!options.confirm) {
	if (fromAlbum.length) {
		console.log('\n  sample of what the album already knows:');
		fromAlbum
			.slice(0, 10)
			.forEach(({ ref, catno }) =>
				console.log(`    ${catno} — ${ref.path}`)
			);
	}

	process.exit(0);
}

const pending = [...junk, ...fromAlbum];

if (planned) {
	const discogs = new DiscogsClient();

	if (!discogs.authenticated) {
		console.warn(
			'\n  no DISCOGS_TOKEN: 25 requests a minute instead of 60'
		);
	}

	console.log(`\n  asking Discogs for ${planned} release(s)…`);

	for (const [index, release] of fromDiscogs.slice(0, planned).entries()) {
		const fetched = await discogs.get(
			`/releases/${release.discogsReleaseId}`
		);
		const catno = catalogNumber(fetched?.labels?.[0]?.catno);

		if (catno) {
			pending.push({ ref: release.ref, catno });
		} else {
			console.log(
				`    ${release.name}: Discogs has no catalog number either`
			);
		}

		if ((index + 1) % 25 === 0) {
			console.log(`    ${index + 1}/${planned}`);
		}
	}
}

if (!pending.length) {
	console.log('\nnothing to write');
	process.exit(0);
}

for (let from = 0; from < pending.length; from += BATCH_SIZE) {
	const batch = db.batch();

	pending
		.slice(from, from + BATCH_SIZE)
		.forEach(({ ref, catno }) => batch.update(ref, stamp({ catno })));

	await batch.commit();
	console.log(
		`  written ${Math.min(from + BATCH_SIZE, pending.length)}/${pending.length}`
	);
}

await touchCatalog(db, ['release']);
console.log('release touched');
