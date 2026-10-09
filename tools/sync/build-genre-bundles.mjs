#!/usr/bin/env node
/**
 * Publishes one Firestore bundle per genre, so a collector who follows a
 * genre downloads that genre instead of the catalog.
 *
 *   node tools/sync/build-genre-bundles.mjs [--env dev|prod]
 *     [--genres rock,jazz] [--confirm]
 *
 * Run it after an import, next to `build-bundles.mjs` — the two are not
 * alternatives. The whole-feature bundles serve everybody who follows no
 * genre (an administrator, a collector who has not chosen), and these serve
 * everybody who does.
 *
 * One file per genre rather than one per genre and feature: a collector
 * following two genres then downloads two files however many collections
 * their records are spread over, and the client loads each file once for all
 * six features in it.
 *
 * What belongs to a genre is worked out here rather than stored on the
 * documents. Only artists and albums carry a genre; a track belongs to its
 * album's, a line-up to its band's, and a musician to every band they played
 * in — which is why a musician can be in two bundles, and should be.
 *
 * Costs one read per catalog document, the same documents `build-bundles.mjs`
 * reads. Without --confirm it only counts them. Needs Firebase Admin
 * credentials (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import {
	GENRE_BUNDLE_FEATURE_KEYS,
	GENRE_BUNDLE_FOLDER,
	announceGenreBundle,
	uploadBundle,
	ensureBundleCors,
	featureVersion,
	removeOldBundles,
} from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		genres: { type: 'string' },
		confirm: { type: 'boolean', default: false },
	},
});

const only = options.genres
	? new Set(
			options.genres
				.split(',')
				.map((slug) => slug.trim())
				.filter(Boolean)
		)
	: null;

const { projectId, storageBucket } = await readEnvironment(options.env);

console.log(
	`${projectId}: genre bundles → gs://${storageBucket}/${GENRE_BUNDLE_FOLDER}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to publish')
);

initializeApp({ credential: applicationDefault(), projectId, storageBucket });
const db = getFirestore();
const bucket = getStorage().bucket();

/**
 * The version the bundles are built as of: the newest of the features in
 * them. One stamp for the file, because the file is loaded whole — a client
 * that has it is current with every feature in it.
 */
const version = await bundleVersion();

if (!version) {
	console.error('No catalog version — run touch-catalog first');
	process.exit(1);
}

const taxonomy = await readTaxonomy();
const slices = await readCatalog(taxonomy);

if (options.confirm) {
	await ensureBundleCors(bucket);
}

for (const [slug, documents] of slices) {
	if (only && !only.has(slug)) {
		continue;
	}

	const name = taxonomy.get(slug) ?? slug;

	if (!options.confirm) {
		console.log(`${slug} (${name}): ${documents.length} documents`);
		continue;
	}

	const builder = db.bundle(`genre-${slug}-${version.seconds}`);

	for (const snapshot of documents) {
		builder.add(snapshot);
	}

	const content = builder.build();
	const gzipped = gzipSync(content);
	const path = `${GENRE_BUNDLE_FOLDER}/${slug}/${version.seconds}.bundle`;

	await uploadBundle(bucket, path, gzipped);
	await announceGenreBundle(db, slug, {
		path,
		modifiedAt: version,
		count: documents.length,
	});
	console.log(
		`${slug} (${name}): ${documents.length} documents, ${kb(content.length)} → ${kb(gzipped.length)} gzip, ${path}`
	);

	await removeOldBundles(bucket, `${GENRE_BUNDLE_FOLDER}/${slug}`, path);
}

function kb(bytes) {
	return `${Math.round(bytes / 1024)} KB`;
}

/** The newest version among the features a genre bundle carries. */
async function bundleVersion() {
	const versions = await Promise.all(
		GENRE_BUNDLE_FEATURE_KEYS.map((featureKey) =>
			featureVersion(db, featureKey)
		)
	);

	return versions
		.filter(Boolean)
		.reduce(
			(newest, version) =>
				!newest ||
				version.seconds > newest.seconds ||
				(version.seconds === newest.seconds &&
					version.nanoseconds > newest.nanoseconds)
					? version
					: newest,
			null
		);
}

/** The genres by slug — the name for the log, and the slug to file by. */
async function readTaxonomy() {
	const snapshot = await db.collection('genre').get();

	return new Map(
		snapshot.docs.map((document) => [document.id, document.get('name')])
	);
}

/**
 * Every catalog document sorted into the genres it belongs to.
 *
 * The order the collections are read in is the order they depend on each
 * other: an album's genre may come from its artist, a track's from its
 * album, a musician's from the bands they were in. A document whose genre
 * cannot be worked out — a band filed under a genre the taxonomy no longer
 * has, say — is left out of every bundle and counted in the log, because a
 * silent omission here is a record missing from somebody's shelf.
 */
async function readCatalog(taxonomy) {
	const slices = new Map();
	const add = (slug, snapshot) => {
		if (!slug) {
			return false;
		}

		const documents = slices.get(slug) ?? [];

		documents.push(snapshot);
		slices.set(slug, documents);
		return true;
	};

	// By the name the documents spell, which is what `album.genre` holds.
	const genreOf = new Map([...taxonomy].map(([slug, name]) => [name, slug]));
	const homeless = {
		artist: 0,
		album: 0,
		track: 0,
		membership: 0,
		contribution: 0,
		musician: 0,
	};

	const artistSlug = new Map();
	const artists = await db.collectionGroup('artist').get();

	for (const artist of artists.docs) {
		const slug = genreOf.get(artist.get('genre'));

		artistSlug.set(artist.id, slug);
		if (!add(slug, artist)) {
			homeless.artist += 1;
		}
	}

	const albumSlug = new Map();
	const albums = await db.collectionGroup('album').get();

	for (const album of albums.docs) {
		// An album's own genre, and its band's where it has none: an import
		// that filled in the band but not the record still belongs on the
		// shelf next to the rest of that band.
		const slug =
			genreOf.get(album.get('genre')) ??
			artistSlug.get(album.ref.parent.parent?.id);

		albumSlug.set(album.id, slug);
		if (!add(slug, album)) {
			homeless.album += 1;
		}
	}

	/** The genres each musician turns up in; a musician may be in several. */
	const musicianSlugs = new Map();
	const credit = (musicianUid, slug) => {
		if (!musicianUid || !slug) {
			return;
		}

		const slugs = musicianSlugs.get(musicianUid) ?? new Set();

		slugs.add(slug);
		musicianSlugs.set(musicianUid, slugs);
	};

	const tracks = await db.collectionGroup('track').get();

	for (const track of tracks.docs) {
		if (!add(albumSlug.get(track.get('albumUid')), track)) {
			homeless.track += 1;
		}
	}

	const memberships = await db.collectionGroup('membership').get();

	for (const membership of memberships.docs) {
		const slug = artistSlug.get(membership.get('artistUid'));

		credit(membership.get('musicianUid'), slug);
		if (!add(slug, membership)) {
			homeless.membership += 1;
		}
	}

	const contributions = await db.collectionGroup('contribution').get();

	for (const contribution of contributions.docs) {
		const slug = albumSlug.get(contribution.get('albumUid'));

		credit(contribution.get('musicianUid'), slug);
		if (!add(slug, contribution)) {
			homeless.contribution += 1;
		}
	}

	const musicians = await db.collectionGroup('musician').get();

	for (const musician of musicians.docs) {
		const slugs = musicianSlugs.get(musician.id);

		if (!slugs?.size) {
			homeless.musician += 1;
			continue;
		}

		// In every genre they played in: a session drummer on a jazz record
		// and a funk one belongs in both bundles, not in whichever was read
		// first.
		for (const slug of slugs) {
			add(slug, musician);
		}
	}

	const left = Object.entries(homeless).filter(([, count]) => count > 0);

	if (left.length) {
		console.warn(
			'Outside every genre, in no bundle: ' +
				left.map(([key, count]) => `${count} ${key}`).join(', ')
		);
	}

	return slices;
}
