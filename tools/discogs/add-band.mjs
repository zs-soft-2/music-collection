#!/usr/bin/env node
/**
 * Adds a band to the catalog from Discogs — for a band the collection does
 * not know at all yet, where `import-discogs` has nothing to start from
 * (it works from albums that are already in the catalog).
 *
 *   node tools/discogs/add-band.mjs --artist 778339
 *     Dry run: downloads the Discogs artist and its own releases (role Main)
 *     into tools/discogs/.cache/, and reports what it would create.
 *
 *   node tools/discogs/add-band.mjs --artist 778339 --confirm
 *     Writes the `artist` document, its albums (artist/{uid}/album/{uid}),
 *     the tracklists, the credits (`musician`, `contribution`) and the
 *     line-up (`membership`). Only missing documents are created: an album
 *     already in the catalog is left exactly as it is.
 *
 *   --country Hungary   the band's country, as CountryEnum spells it
 *   --formed-in 2000    the year the band formed (Discogs does not know it)
 *   --skip 16450872     Discogs master/release ids not to import (a
 *                       repackaging of two earlier records, a video, …)
 *   --refresh           re-download instead of using the cache
 *
 * Styles come from the releases: the Discogs styles the catalog's StyleEnum
 * knows (a band style is one at least two releases carry), the rest are
 * reported and dropped. Needs Firebase Admin credentials for --confirm
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ENV_OPTION, readEnvironment } from '../sync/environment.mjs';
import { DiscogsClient } from './discogs-client.mjs';
import {
	searchParameters,
	stripDiscogsSuffix,
	toCreditDocs,
	toGroupMembershipDocs,
	toOriginalRelease,
	toTrackDocs,
	trimRelease,
} from './discogs-mapping.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CACHE = join(HERE, '.cache');
const ALBUM_CACHE = join(CACHE, 'albums');
const BAND_CACHE = join(CACHE, 'bands');
const STYLE_ENUM = join(
	ROOT,
	'libs/common/api/src/lib/music/genre/genre.enum.ts'
);

/** A style is the band's own when at least this many releases carry it. */
const BAND_STYLE_MIN = 2;

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		artist: { type: 'string' },
		country: { type: 'string' },
		'formed-in': { type: 'string' },
		skip: { type: 'string', default: '' },
		refresh: { type: 'boolean', default: false },
		confirm: { type: 'boolean', default: false },
	},
});

if (!options.artist) {
	console.error('--artist <discogs artist id> is required');
	process.exit(1);
}

const skipped = new Set(
	options.skip
		.split(',')
		.map((id) => Number(id.trim()))
		.filter(Boolean)
);

/** The catalog's styles, by their normalized form ("post rock" → "Post-Rock"). */
async function catalogStyles() {
	const source = await readFile(STYLE_ENUM, 'utf8');
	const body = source.match(/export enum StyleEnum \{([^}]*)\}/s)?.[1] ?? '';
	const normalize = (style) =>
		style
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();

	return new Map(
		[...body.matchAll(/=\s*'([^']+)'/g)].map((match) => [
			normalize(match[1]),
			match[1],
		])
	);
}

/** Discogs styles the catalog knows; the unknown ones are reported. */
function mapStyles(styles, known, dropped) {
	const mapped = [];

	for (const style of styles) {
		const hit = known.get(
			style
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, ' ')
				.trim()
		);
		if (hit) {
			if (!mapped.includes(hit)) mapped.push(hit);
		} else {
			dropped.add(style);
		}
	}
	return mapped;
}

/** Discogs formats → the catalog's album format. */
function albumFormat(formats) {
	const descriptions = formats.flatMap((format) => [
		format.name,
		...(format.descriptions ?? []),
	]);
	const has = (name) =>
		descriptions.some((d) => d.toLowerCase() === name.toLowerCase());

	if (has('Compilation')) return 'compilation';
	if (has('Live')) return 'live';
	if (has('Maxi-Single')) return 'maxi';
	if (has('EP')) return 'ep';
	if (has('Single') || (has('7"') && !has('Album'))) return 'single';

	return 'lp';
}

/**
 * "2016-05-05" or "2016" → local midnight, the way the catalog stores an
 * album's year: epoch milliseconds, which the client reads back as a Date.
 */
function releaseDate(release) {
	const [year, month, day] = String(release.released || release.year || '')
		.split('-')
		.map((part) => Number(part));

	return year ? new Date(year, (month || 1) - 1, day || 1) : null;
}

const cover = (release) => release.images?.[0]?.uri ?? null;

/** The band's own releases on Discogs: masters and the loose releases. */
async function fetchBand(client) {
	await mkdir(BAND_CACHE, { recursive: true });
	const file = join(BAND_CACHE, `${options.artist}.json`);

	if (!options.refresh && existsSync(file)) {
		return JSON.parse(await readFile(file, 'utf8'));
	}

	const profile = await client.get(`/artists/${options.artist}`);
	if (!profile) {
		throw new Error(`Discogs artist ${options.artist} not found`);
	}

	const entries = [];
	for (let page = 1; ; page++) {
		const list = await client.get(`/artists/${options.artist}/releases`, {
			per_page: 100,
			page,
			sort: 'year',
		});
		entries.push(...(list?.releases ?? []));
		if (page >= (list?.pagination?.pages ?? 1)) break;
	}

	const band = {
		profile: {
			id: profile.id,
			name: stripDiscogsSuffix(profile.name),
			profile: profile.profile?.trim() || '',
			urls: profile.urls ?? [],
			imageUrl: cover(profile),
			members: (profile.members ?? []).map((member) => ({
				id: member.id,
				name: member.name,
				active: !!member.active,
			})),
		},
		entries: entries
			.filter((entry) => entry.role === 'Main')
			.map((entry) => ({
				type: entry.type,
				id: entry.id,
				title: entry.title,
				year: entry.year ?? null,
			})),
		fetchedAt: new Date().toISOString(),
	};

	await writeFile(file, JSON.stringify(band, null, 2));
	return band;
}

/**
 * The album's own Discogs release: the master's original pressing, or the
 * release itself. Cached the way `import-discogs` caches albums, so its
 * commands can work with these albums afterwards too.
 */
async function fetchRelease(client, entry, album) {
	await mkdir(ALBUM_CACHE, { recursive: true });
	const file = join(ALBUM_CACHE, `${album.uid}.json`);

	if (!options.refresh && existsSync(file)) {
		return JSON.parse(await readFile(file, 'utf8'));
	}

	let releaseId = entry.id;
	if (entry.type === 'master') {
		const master = await client.get(`/masters/${entry.id}`);
		releaseId = master?.main_release ?? null;
	}
	const raw = releaseId ? await client.get(`/releases/${releaseId}`) : null;
	const release = raw ? trimRelease(raw) : null;
	const cached = {
		album: {
			...album,
			year: release
				? (releaseDate(release)?.getFullYear() ?? null)
				: null,
			format: release ? albumFormat(release.formats) : null,
		},
		match: {
			status: 'matched',
			type: entry.type,
			masterId: entry.type === 'master' ? entry.id : null,
			releaseId: raw?.id ?? null,
			score: null,
			candidates: [],
		},
		release,
		coverImageUrl: raw ? cover(raw) : null,
		styles: raw?.styles ?? [],
		fetchedAt: new Date().toISOString(),
	};

	await writeFile(file, JSON.stringify(cached, null, 2));
	return cached;
}

async function openFirestore() {
	const { initializeApp, applicationDefault } =
		await import('firebase-admin/app');
	const { getFirestore } = await import('firebase-admin/firestore');
	const { projectId } = await readEnvironment(options.env);

	initializeApp({ credential: applicationDefault(), projectId });
	return getFirestore();
}

/** Creates the documents that do not exist yet; never touches the others. */
async function createMissing(db, items) {
	const snaps = items.length
		? await db.getAll(...items.map((item) => item.ref))
		: [];
	const missing = items.filter((_, index) => !snaps[index].exists);

	return { ops: missing.map((item) => ({ type: 'create', ...item })) };
}

async function writeOps(db, ops) {
	const { featureKeyOf, stamp, touchCatalog } =
		await import('../sync/catalog-sync.mjs');
	const writer = db.bulkWriter();
	const failures = [];

	writer.onWriteError((error) => {
		const fatal = [7, 8].includes(error.code);
		if (fatal || error.failedAttempts >= 3) {
			failures.push(`${error.documentRef.path}: ${error.message}`);
			return false;
		}
		return true;
	});
	for (const op of ops) {
		writer.create(op.ref, stamp(op.data));
	}
	await writer.close();
	// After the writes: the version must not be older than what it covers.
	await touchCatalog(db, [...new Set(ops.map((op) => featureKeyOf(op.ref)))]);

	return failures;
}

async function main() {
	const client = new DiscogsClient();
	const known = await catalogStyles();
	const dropped = new Set();
	const band = await fetchBand(client);
	const artistUid = `discogs-${band.profile.id}`;

	console.log(
		`${band.profile.name} (discogs ${band.profile.id}): ${band.entries.length} own releases, ` +
			`${band.profile.members.length} members`
	);

	const albums = [];
	const styleCount = new Map();

	for (const entry of band.entries) {
		if (skipped.has(entry.id)) {
			console.log(`  skipped: ${entry.title} (${entry.id})`);
			continue;
		}
		const albumUid = `discogs-${entry.type === 'master' ? '' : 'r'}${entry.id}`;
		const cached = await fetchRelease(client, entry, {
			uid: albumUid,
			path: `artist/${artistUid}/album/${albumUid}`,
			name: entry.title,
			artistName: band.profile.name,
		});

		if (!cached.release) {
			console.log(`  no release: ${entry.title} (${entry.id})`);
			continue;
		}
		const styles = mapStyles(cached.styles, known, dropped);
		for (const style of styles) {
			styleCount.set(style, (styleCount.get(style) ?? 0) + 1);
		}
		// `styles` last: the mapped ones, not the Discogs spelling in the cache.
		albums.push({ entry, albumUid, ...cached, styles });
	}

	const bandStyles = [...styleCount.entries()]
		.filter(([, count]) => count >= BAND_STYLE_MIN)
		.sort((a, b) => b[1] - a[1])
		.map(([style]) => style);

	const artist = {
		uid: artistUid,
		name: band.profile.name,
		entityType: 'Artist',
		artistType: 'band',
		country: options.country ?? null,
		genre: 'Rock',
		description: band.profile.profile,
		formedIn: options['formed-in']
			? new Date(Number(options['formed-in']), 0, 1).toISOString()
			: null,
		sites: band.profile.urls,
		styles: bandStyles,
		imageUrl: null,
		mainImage: null,
		headerImage: null,
		searchParameters: searchParameters(band.profile.name),
		discogs: { artistId: band.profile.id, imageUrl: band.profile.imageUrl },
		source: 'discogs',
	};

	const db = await openFirestore();
	const artistRef = db.collection('artist').doc(artistUid);
	const albumArtist = {
		uid: artistUid,
		entityType: 'Artist',
		name: artist.name,
		searchParameters: artist.searchParameters,
	};

	const items = [{ ref: artistRef, data: artist }];

	for (const album of albums) {
		const date = releaseDate(album.release);
		const data = {
			uid: album.albumUid,
			name: album.release.title,
			entityType: 'Album',
			artist: albumArtist,
			year: date ? date.getTime() : null,
			genre: 'Rock',
			format: albumFormat(album.release.formats),
			styles: album.styles,
			songs: [],
			coverImage: null,
			coverImageUrl: album.coverImageUrl,
			spotifyAlbumId: null,
			youtubePlaylistId: null,
			youtubeVideoIds: [],
			searchParameters: searchParameters(album.release.title),
			discogs: toOriginalRelease(album.match, album.release),
		};
		items.push({ ref: artistRef.collection('album').doc(data.uid), data });

		for (const track of toTrackDocs(album.albumUid, album.release)) {
			items.push({
				ref: db.collection('track').doc(track.uid),
				data: track,
			});
		}
		const credits = toCreditDocs(album.albumUid, album.release);
		for (const musician of credits.musicians) {
			items.push({
				ref: db.collection('musician').doc(musician.uid),
				data: musician,
			});
		}
		for (const contribution of credits.contributions) {
			items.push({
				ref: db.collection('contribution').doc(contribution.uid),
				data: contribution,
			});
		}
		console.log(
			`  ${data.format.padEnd(11)} ${date?.getFullYear() ?? '????'}  ${data.name}` +
				`  (${album.release.tracklist.length} tracks, ${credits.contributions.length} credits)` +
				`  [${data.styles.join(', ')}]`
		);
	}

	for (const membership of toGroupMembershipDocs(artistUid, band.profile)) {
		items.push({
			ref: db.collection('membership').doc(membership.uid),
			data: membership,
		});
		items.push({
			ref: db.collection('musician').doc(membership.musicianUid),
			data: {
				uid: membership.musicianUid,
				name: membership.musicianName,
				discogsId: Number(
					membership.musicianUid.replace('discogs-', '')
				),
				entityType: 'Musician',
				source: 'discogs',
			},
		});
	}

	// A musician credited on a release is also a member: one document each.
	const unique = new Map(items.map((item) => [item.ref.path, item]));
	const { ops } = await createMissing(db, [...unique.values()]);
	const perCollection = new Map();
	for (const op of ops) {
		const key = op.ref.parent.id;
		perCollection.set(key, (perCollection.get(key) ?? 0) + 1);
	}

	console.log(
		`\nartist styles: ${bandStyles.join(', ') || '—'}` +
			(dropped.size
				? `\nstyles not in the catalog, dropped: ${[...dropped].join(', ')}`
				: '')
	);
	console.log(
		`${ops.length} documents to create (${[...perCollection]
			.map(([key, count]) => `${count} ${key}`)
			.join(', ')}), ${unique.size - ops.length} already there`
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
