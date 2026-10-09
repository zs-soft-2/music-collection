#!/usr/bin/env node
/**
 * Adds one Discogs release to the catalog as an album with its tracklist —
 * for a record the band's own discography does not list: a compilation, a
 * tribute, a sampler, a pressing `add-band` skipped.
 *
 *   node tools/discogs/add-release.mjs --release 12032502 --artist ft2DzrMy18TUht42GPrE
 *     Dry run: downloads the release into tools/discogs/.cache/albums/ and
 *     reports the album and the tracks it would create.
 *
 *   node tools/discogs/add-release.mjs --release 12032502 --artist ft2DzrMy18TUht42GPrE --confirm
 *     Writes `artist/{artist}/album/discogs-r{release}` and its `track`
 *     documents. Only missing documents are created: an album already in the
 *     catalog is left exactly as it is.
 *
 *   --artist UID        the catalog artist the album is filed under (its own
 *                       document id, not a Discogs id) — the album lives
 *                       under it, so pick the band the record is about
 *   --track-artists     write each track's own performer into its name
 *                       ("Jon Bon Jovi – Open Your Heart"); for a Various
 *                       Artists compilation, where every track has one
 *   --format compilation  override the format read from the Discogs formats
 *   --genre Rock        the genre to file the album under, overriding the one
 *                       the release names
 *   --refresh           re-download instead of using the cache
 *
 * The genre and the styles are read against the taxonomy in `genre/{slug}`
 * (the admin page), the way `add-band` reads them; a release that names no
 * style of its own inherits the artist's. Needs Firebase Admin credentials,
 * the dry run included, as the taxonomy and the artist are read from
 * Firestore (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { readEnvironment } from '../sync/environment.mjs';
import {
	ENV_OPTION,
	catalogTaxonomy,
	createMissing,
	mapStyles,
	normalizeName,
	openFirestore,
	writeOps,
} from './catalog-write.mjs';
import { DiscogsClient } from './discogs-client.mjs';
import {
	albumFormat,
	coverUrl,
	releaseDate,
	searchParameters,
	toOriginalRelease,
	toTrackDocs,
	trimRelease,
} from './discogs-mapping.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ALBUM_CACHE = join(HERE, '.cache', 'albums');

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		release: { type: 'string' },
		artist: { type: 'string' },
		format: { type: 'string' },
		genre: { type: 'string' },
		'track-artists': { type: 'boolean', default: false },
		refresh: { type: 'boolean', default: false },
		confirm: { type: 'boolean', default: false },
	},
});

for (const required of ['release', 'artist']) {
	if (!options[required]) {
		console.error(
			`--release <discogs release id> and --artist <catalog artist uid> are both required`
		);
		process.exit(1);
	}
}

/** The release, cached the way `import-discogs` caches an album. */
async function fetchRelease(client, albumUid) {
	await mkdir(ALBUM_CACHE, { recursive: true });
	const file = join(ALBUM_CACHE, `${albumUid}.json`);

	if (!options.refresh && existsSync(file)) {
		return JSON.parse(await readFile(file, 'utf8'));
	}

	const raw = await client.get(`/releases/${options.release}`);

	if (!raw) {
		throw new Error(`Discogs release ${options.release} not found`);
	}
	const release = trimRelease(raw);
	const cached = {
		album: {
			uid: albumUid,
			name: release.title,
			year: releaseDate(release)?.getFullYear() ?? null,
			format: albumFormat(release.formats),
		},
		match: {
			status: 'matched',
			type: 'release',
			masterId: release.masterId,
			releaseId: release.id,
			score: null,
			candidates: [],
		},
		release,
		coverImageUrl: coverUrl(raw),
		styles: raw.styles ?? [],
		genres: raw.genres ?? [],
		fetchedAt: new Date().toISOString(),
	};

	await writeFile(file, JSON.stringify(cached, null, 2));
	return cached;
}

/**
 * The genre the album is filed under: `--genre`, else the first one the
 * release names that the taxonomy holds, else the artist's own.
 */
function albumGenre(releaseGenres, artistGenre, taxonomy) {
	const named = options.genre
		? taxonomy.genres.get(normalizeName(options.genre))
		: null;

	if (options.genre && !named) {
		throw new Error(
			`unknown genre: ${options.genre} — add it on /admin/genre first`
		);
	}
	if (named) {
		return named;
	}
	for (const name of releaseGenres) {
		const known = taxonomy.genres.get(normalizeName(name));

		if (known) return known;
	}
	return artistGenre ?? null;
}

async function main() {
	const client = new DiscogsClient();
	// Firestore first: the taxonomy and the artist live there, and a dry run
	// needs both.
	const db = await openFirestore(options.env);
	const taxonomy = await catalogTaxonomy(db);
	const artistRef = db.collection('artist').doc(options.artist);
	const artist = (await artistRef.get()).data();

	if (!artist) {
		throw new Error(`no artist ${options.artist} in the catalog`);
	}

	const albumUid = `discogs-r${options.release}`;
	const cached = await fetchRelease(client, albumUid);
	const { release } = cached;
	const dropped = new Set();
	// A release that names no style of its own is filed under the artist's.
	const styles = cached.styles.length
		? mapStyles(cached.styles, taxonomy.styles, dropped)
		: (artist.styles ?? []);
	const genre = albumGenre(cached.genres, artist.genre, taxonomy);

	if (!genre) {
		throw new Error(
			'no genre: neither the release nor the artist names one the ' +
				'taxonomy holds — pass --genre, or add it on /admin/genre'
		);
	}

	const date = releaseDate(release);
	const album = {
		uid: albumUid,
		name: release.title,
		entityType: 'Album',
		artist: {
			uid: options.artist,
			entityType: 'Artist',
			name: artist.name,
			searchParameters: artist.searchParameters ?? [],
		},
		// Epoch milliseconds, not a Date: that is how the client reads a year.
		year: date ? date.getTime() : null,
		genre,
		format: options.format ?? albumFormat(release.formats),
		styles,
		songs: [],
		coverImage: null,
		coverImageUrl: cached.coverImageUrl,
		spotifyAlbumId: null,
		youtubePlaylistId: null,
		youtubeVideoIds: [],
		searchParameters: searchParameters(release.title),
		discogs: toOriginalRelease(cached.match, release),
	};
	const tracks = toTrackDocs(albumUid, release, {
		withArtists: options['track-artists'],
	});

	const items = [
		{ ref: artistRef.collection('album').doc(albumUid), data: album },
		...tracks.map((track) => ({
			ref: db.collection('track').doc(track.uid),
			data: track,
		})),
	];

	console.log(
		`${artist.name} / ${album.name}\n` +
			`  ${album.format}, ${date?.getFullYear() ?? '????'}, ` +
			`${release.country ?? '?'}, ` +
			`${release.labels.map((label) => `${label.name} ${label.catno ?? ''}`.trim()).join(', ') || 'no label'}\n` +
			`  genre: ${genre}, styles: ${styles.join(', ') || '—'}` +
			(dropped.size
				? `\n  styles not in the catalog, dropped: ${[...dropped].join(', ')}`
				: '')
	);
	for (const track of tracks) {
		console.log(
			`  ${(track.position ?? '').padEnd(5)} ${track.name}` +
				`${track.duration ? `  (${track.duration})` : ''}` +
				`${track.heading ? `  [${track.heading}]` : ''}`
		);
	}

	const { ops } = await createMissing(db, items);

	console.log(
		`\n${ops.length} documents to create ` +
			`(${ops.filter((op) => op.ref.parent.id === 'album').length} album, ` +
			`${ops.filter((op) => op.ref.parent.id === 'track').length} track), ` +
			`${items.length - ops.length} already there`
	);

	if (!options.confirm) {
		console.log('DRY RUN — re-run with --confirm to write');
		return;
	}
	const failures = await writeOps(db, ops);
	console.log(
		failures.length
			? `${failures.length} FAILED:\n${failures.join('\n')}`
			: `written to ${(await readEnvironment(options.env)).projectId}`
	);
	if (failures.length) process.exitCode = 1;
}

await main();
