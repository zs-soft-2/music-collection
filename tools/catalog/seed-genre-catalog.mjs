#!/usr/bin/env node
/**
 * Writes the artists and albums of `genre-seed-data.mjs` into the catalog —
 * the genres that stood empty next to rock.
 *
 *   node tools/catalog/seed-genre-catalog.mjs [--env dev|prod] [--confirm]
 *     [--genres jazz,reggae] [--covers] [--fill-covers] [--force] [--remove]
 *
 * Without `--confirm` it only reports what it would write. `--genres` narrows
 * the run to those taxonomy slugs; `--covers` asks MusicBrainz and the Cover
 * Art Archive for a sleeve per album (one request a second, so it takes a
 * couple of minutes and is left off by default). `--fill-covers` asks only
 * for the albums that have none yet and writes nothing else, which is how a
 * throttled run is made up for.
 *
 * Every document id starts with `seed-`, which makes the script re-runnable:
 * an artist or album already there is left exactly as it is. `--force`
 * overwrites them — an uploaded cover and an admin's edits with them — and
 * `--remove` deletes them again, including the releases
 * under them, which is what a collector's copies point at, so `--remove`
 * refuses while a seeded copy is still on somebody's shelf (run
 * `seed-mock-collectors.mjs --remove` first).
 *
 * The styles are checked against the taxonomy in `genre/{slug}` before
 * anything is written: a style the taxonomy does not know would fall out of
 * the forms and out of the matching, silently, and that is exactly the kind
 * of seed that looks fine until somebody opens a form.
 *
 * Needs Firebase Admin credentials, the dry run included, as the taxonomy is
 * read from Firestore (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { featureKeyOf, stamp, tombstone, touchCatalog } from '../sync/catalog-sync.mjs';
import { searchParameters } from '../discogs/discogs-mapping.mjs';
import { GENRE_SEED, seedUid } from './genre-seed-data.mjs';

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';
const RELEASE_COLLECTION = 'release';
/** `libs/common/api` EntityTypeEnum. */
const ARTIST_TYPE = 'Artist';
const ALBUM_TYPE = 'Album';

/** MusicBrainz: one request a second per IP, and it wants to know who asks. */
const MUSICBRAINZ_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_INTERVAL_MS = 1100;
/** Attempts after a throttled request, waiting longer each time. */
const MUSICBRAINZ_RETRIES = 3;
const USER_AGENT =
	'MusicCollection/1.0 (https://github.com/zsagia/music-collection)';
/** The same sleeve URL shape the imported albums and upcoming releases use. */
const COVER_ART_URL = 'https://coverartarchive.org/release-group';

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
		covers: { type: 'boolean', default: false },
		'fill-covers': { type: 'boolean', default: false },
		force: { type: 'boolean', default: false },
		genres: { type: 'string' },
		remove: { type: 'boolean', default: false },
	},
});

const wanted = options.genres
	? new Set(options.genres.split(',').map((slug) => slug.trim()))
	: null;
const genres = GENRE_SEED.filter(({ slug }) => !wanted || wanted.has(slug));

if (!genres.length) {
	throw new Error(
		`no seeded genre matches --genres (${GENRE_SEED.map((g) => g.slug).join(', ')})`
	);
}

const { projectId } = await readEnvironment(options.env);

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();

console.log(
	`${projectId}: ${genres.map(({ slug }) => slug).join(', ')}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

/**
 * The taxonomy as the admin page keeps it: the styles of each genre, by name.
 * Read even for a dry run — which styles exist is data, not a list in this
 * repository.
 */
const taxonomy = new Map();

for (const document of (await db.collection('genre').get()).docs) {
	taxonomy.set(document.get('name'), new Set(document.get('styles') ?? []));
}

/** Every style of the seed must exist under its own genre, or nothing runs. */
const problems = [];

for (const { genre, artists } of genres) {
	const styles = taxonomy.get(genre);

	if (!styles) {
		problems.push(`genre "${genre}" is not in the taxonomy — run seed-genres.mjs`);
		continue;
	}

	for (const artist of artists) {
		const check = (owner, list) => {
			for (const style of list) {
				if (!styles.has(style)) {
					problems.push(`${genre} / ${owner}: unknown style "${style}"`);
				}
			}
		};

		check(artist.name, artist.styles);
		artist.albums.forEach((album) => check(`${artist.name} — ${album.name}`, album.styles));
	}
}

if (problems.length) {
	problems.forEach((problem) => console.error(`  ${problem}`));
	throw new Error(
		`${problems.length} style(s) missing from the taxonomy — add them on /admin/genre and run again`
	);
}

/**
 * The sleeve, from the same place the imported albums' covers come from: the
 * MusicBrainz release group of the record, and the Cover Art Archive's front
 * image of it. Null where either has nothing — a missing cover draws the
 * shelf's own colour, a wrong URL draws a broken image.
 */
async function coverUrl(artistName, albumName) {
	// The artist first, then the title alone. The second try is for the
	// records filed under somebody else — a classical release is under its
	// composer, not the orchestra on the sleeve — and it is safe only because
	// an album title is specific enough to stand on its own; a title that is
	// not will simply find nothing, which is the right answer.
	const group =
		(await releaseGroup(`release:${quote(albumName)} AND artist:${quote(artistName)}`)) ??
		((await wait(MUSICBRAINZ_INTERVAL_MS)),
		await releaseGroup(`release:${quote(albumName)}`));

	if (!group) {
		return null;
	}

	const cover = `${COVER_ART_URL}/${group.id}/front-500`;
	// The archive answers 404 for a group nobody uploaded a sleeve for, and
	// the only way to know is to ask.
	const head = await fetch(cover, { method: 'HEAD', redirect: 'follow' });

	return head.ok ? cover : null;
}

/**
 * The first release group MusicBrainz offers for the query, or null.
 *
 * A 503 is what the rate limiter answers when a request came too soon, and it
 * is the one failure worth retrying: left alone it would quietly leave the
 * album without a sleeve, which looks exactly like "the archive has none".
 */
async function releaseGroup(query, attempt = 1) {
	const url = `${MUSICBRAINZ_URL}/release-group?query=${encodeURIComponent(query)}&limit=1&fmt=json`;
	const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

	if (!response.ok) {
		if ([429, 503].includes(response.status) && attempt <= MUSICBRAINZ_RETRIES) {
			await wait(MUSICBRAINZ_INTERVAL_MS * (attempt + 1));

			return releaseGroup(query, attempt + 1);
		}

		console.warn(`    cover: MusicBrainz ${response.status} for ${query}`);
		return null;
	}

	const group = (await response.json())['release-groups']?.[0];

	// A search always answers; the score says how much of the query it
	// actually matched, and anything under 90 is a different record.
	return group && (group.score ?? 0) >= 90 ? group : null;
}

const quote = (value) => `"${value.replace(/"/g, '')}"`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Local midnight of January 1st, as the catalog keeps its year-only dates. */
const yearStart = (year) => new Date(year, 0, 1);

function toArtistDocument({ slug, name, artistType, country, description, formedIn, styles }, genre) {
	return {
		uid: seedUid(slug),
		entityType: ARTIST_TYPE,
		name,
		searchParameters: searchParameters(name),
		artistType: artistType ?? 'band',
		// Left out where `CountryEnum` has no entry for it (Jamaica, Austria,
		// Estonia): the origin is in the description instead, the way the
		// Discogs import leaves an unknown country to the admin.
		...(country ? { country } : {}),
		description,
		// An ISO string, not a Date: the Admin SDK would write a Timestamp,
		// and the client reads this field as a string.
		formedIn: formedIn ? yearStart(formedIn).toISOString() : null,
		genre,
		styles: [...styles].sort((one, other) => one.localeCompare(other)),
		sites: [],
		source: 'seed',
	};
}

function toAlbumDocument(album, artist, genre, cover) {
	return {
		uid: seedUid(album.slug),
		entityType: ALBUM_TYPE,
		name: album.name,
		searchParameters: searchParameters(album.name),
		artist: {
			uid: seedUid(artist.slug),
			entityType: ARTIST_TYPE,
			name: artist.name,
			searchParameters: searchParameters(artist.name),
		},
		coverImage: null,
		coverImageUrl: cover,
		format: album.format ?? 'lp',
		genre,
		styles: [...album.styles].sort((one, other) => one.localeCompare(other)),
		songs: [],
		// Epoch milliseconds, not a Date: see `formedIn` above.
		year: yearStart(album.year).getTime(),
		spotifyAlbumId: null,
		youtubePlaylistId: null,
		youtubeVideoIds: [],
	};
}

if (options.remove) {
	await remove();
	process.exit(0);
}

if (options['fill-covers']) {
	await fillCovers();
	process.exit(0);
}

/**
 * Asks for the sleeves still missing, and writes nothing but those: a seeded
 * album whose cover lookup was throttled is the only thing that changes.
 */
async function fillCovers() {
	const found = [];

	for (const { genre, artists } of genres) {
		for (const artist of artists) {
			for (const album of artist.albums) {
				const ref = db
					.collection(ARTIST_COLLECTION)
					.doc(seedUid(artist.slug))
					.collection(ALBUM_COLLECTION)
					.doc(seedUid(album.slug));
				const snapshot = await ref.get();

				if (!snapshot.exists || snapshot.get('coverImageUrl')) {
					continue;
				}

				await wait(MUSICBRAINZ_INTERVAL_MS);

				const cover = await coverUrl(artist.name, album.name);

				console.log(
					`  ${cover ? 'cover ' : 'none  '}  ${genre} / ${artist.name} — ${album.name}`
				);

				if (cover) {
					found.push({ ref, data: { coverImageUrl: cover } });
				}
			}
		}
	}

	if (!found.length) {
		console.log('no cover to fill in');
		return;
	}
	if (!options.confirm) {
		console.log(`DRY RUN — ${found.length} cover(s); add --confirm`);
		return;
	}

	const writer = db.bulkWriter();

	// Merge: the cover is the only field this run knows anything about.
	found.forEach(({ ref, data }) => writer.set(ref, stamp(data), { merge: true }));
	await writer.close();
	await touchCatalog(db, [ALBUM_COLLECTION]);

	console.log(`filled ${found.length} cover(s)`);
}

/** What the run would write, by reference, with the existing ones dropped. */
const items = [];

for (const { genre, artists } of genres) {
	for (const artist of artists) {
		const artistRef = db.collection(ARTIST_COLLECTION).doc(seedUid(artist.slug));

		items.push({
			ref: artistRef,
			label: artist.name,
			data: toArtistDocument(artist, genre),
		});

		for (const album of artist.albums) {
			items.push({
				ref: artistRef.collection(ALBUM_COLLECTION).doc(seedUid(album.slug)),
				label: `  ${album.name} (${album.year})`,
				album,
				artist,
				genre,
			});
		}
	}
}

const snapshots = await db.getAll(...items.map((item) => item.ref));
const writes = [];

for (const [index, item] of items.entries()) {
	const exists = snapshots[index].exists;

	if (exists && !options.force) {
		console.log(`  skip    ${item.label}`);
		continue;
	}

	if (item.album) {
		const previous = snapshots[index].get('coverImageUrl') ?? null;
		const cover = options.covers
			? ((await wait(MUSICBRAINZ_INTERVAL_MS)),
				(await coverUrl(item.artist.name, item.album.name)) ?? previous)
			: previous;

		item.data = toAlbumDocument(item.album, item.artist, item.genre, cover);
	}

	writes.push(item);
	console.log(
		`  ${exists ? 'update' : 'create'}  ${item.label}` +
			(item.data.coverImageUrl ? ' [cover]' : '')
	);
}

if (!writes.length) {
	console.log('nothing to write');
	process.exit(0);
}
if (!options.confirm) {
	console.log(`DRY RUN — ${writes.length} document(s); add --confirm`);
	process.exit(0);
}

await write(writes);

/** Writes through the sync wrapper, so the clients learn about the documents. */
async function write(operations) {
	const writer = db.bulkWriter();
	const failures = [];

	writer.onWriteError((error) => {
		if ([7, 8].includes(error.code) || error.failedAttempts >= 3) {
			failures.push(`${error.documentRef.path}: ${error.message}`);
			return false;
		}
		return true;
	});

	operations.forEach(({ ref, data }) => {
		writer.set(ref, stamp(data));
	});
	await writer.close();

	// After the writes: the version must not be older than what it covers.
	await touchCatalog(db, [...new Set(operations.map(({ ref }) => featureKeyOf(ref)))]);

	failures.forEach((failure) => console.error(`  FAILED ${failure}`));
	console.log(
		`written ${operations.length - failures.length}/${operations.length}` +
			`, ${ARTIST_COLLECTION} and ${ALBUM_COLLECTION} touched`
	);
}

/**
 * Takes the seed back out: the albums, the releases under them and the
 * artists, each with a tombstone, so the clients drop them from their caches
 * as well.
 *
 * A seeded release a collector still holds a copy of is not deleted — the
 * copy embeds it and would be left pointing at nothing. The mock collectors
 * come out with their own script.
 */
async function remove() {
	const held = new Set(
		(await db.collectionGroup('collection-item').select('release').get()).docs
			.map((copy) => copy.get('release')?.uid)
			.filter((uid) => typeof uid === 'string')
	);
	const deletions = [];
	const kept = [];

	for (const { artists } of genres) {
		for (const artist of artists) {
			const artistRef = db.collection(ARTIST_COLLECTION).doc(seedUid(artist.slug));

			for (const album of artist.albums) {
				const albumRef = artistRef.collection(ALBUM_COLLECTION).doc(seedUid(album.slug));
				const releases = await albumRef.collection(RELEASE_COLLECTION).get();

				releases.docs.forEach((release) => {
					if (held.has(release.id)) {
						kept.push(`${album.name} — ${release.id}`);
					} else {
						deletions.push(release.ref);
					}
				});
				deletions.push(albumRef);
			}

			deletions.push(artistRef);
		}
	}

	if (kept.length) {
		kept.forEach((item) => console.error(`  held by a collector: ${item}`));
		throw new Error(
			`${kept.length} seeded release(s) are still on a shelf — run seed-mock-collectors.mjs --remove --confirm first`
		);
	}

	console.log(`  ${deletions.length} document(s) to delete`);

	if (!options.confirm) {
		console.log('DRY RUN — add --confirm');
		return;
	}

	const writer = db.bulkWriter();

	deletions.forEach((ref) => {
		writer.delete(ref);

		const marker = tombstone(db, ref);

		writer.set(marker.ref, marker.data);
	});
	await writer.close();
	await touchCatalog(db, [...new Set(deletions.map((ref) => featureKeyOf(ref)))]);

	console.log(`deleted ${deletions.length}`);
}
