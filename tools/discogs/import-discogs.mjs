#!/usr/bin/env node
/**
 * Discogs import — tracklists and credits (musicians + roles) of the albums.
 *
 *   node tools/discogs/import-discogs.mjs fetch [--limit N] [--album UID] [--refresh]
 *     Reads the catalog albums (public Firestore REST read), finds each album's
 *     Discogs master and downloads its main (original) release into
 *     tools/discogs/.cache/. Read-only and resumable; writes report.json.
 *
 *   node tools/discogs/import-discogs.mjs write [--album UID] [--confirm] [--replace]
 *     Turns the cached releases into `track`, `musician` and `contribution`
 *     documents and the original release summary on `album.discogs`.
 *     Default mode fills in: missing documents are created and existing ones
 *     only get their missing fields — nothing is overwritten or deleted, an
 *     album with a hand-made tracklist keeps it, and a credit the album
 *     already has (same musician and role) is not added again.
 *     Only unambiguous matches are written unless --include-ambiguous is given.
 *     --replace instead replaces the album's previously imported Discogs data.
 *     Without --confirm it is a dry run that reports, per album, what would be
 *     created, completed or left unchanged. Needs Firebase Admin credentials
 *     (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 *
 *   node tools/discogs/import-discogs.mjs fetch-artists [--refresh]
 *     Refreshes the cached album years and downloads each band's Discogs member
 *     list. `write` then also creates `membership` documents (musician ↔ band,
 *     member or guest, instruments, from–to album years, active flag).
 *     --memberships-only skips the album data.
 *
 * Optional: DISCOGS_TOKEN (personal access token) raises the rate limit from
 * 25 to 60 requests per minute.
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { DiscogsClient } from './discogs-client.mjs';
import {
	bandDiscogsId,
	rankCandidates,
	toCreditDocs,
	toMembershipDocs,
	toOriginalRelease,
	toTrackDocs,
	trimRelease,
	yearOf,
} from './discogs-mapping.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CACHE = join(HERE, '.cache');
const ALBUM_CACHE = join(CACHE, 'albums');
const ARTIST_CACHE = join(CACHE, 'artists');

const { positionals, values: options } = parseArgs({
	allowPositionals: true,
	options: {
		limit: { type: 'string' },
		album: { type: 'string' },
		refresh: { type: 'boolean', default: false },
		confirm: { type: 'boolean', default: false },
		replace: { type: 'boolean', default: false },
		'memberships-only': { type: 'boolean', default: false },
		'include-ambiguous': { type: 'boolean', default: false },
	},
});

/** Project id and web API key of the app (used for public REST reads). */
async function firebaseConfig() {
	const source = await readFile(
		join(ROOT, 'apps/music-collection/src/environments/environment.ts'),
		'utf8'
	);
	const pick = (key) => source.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1];

	return { projectId: pick('projectId'), apiKey: pick('apiKey') };
}

/**
 * All documents of a collection group via the public REST API. Albums live
 * under their artist (`artist/{artistUid}/album/{albumUid}`).
 */
async function queryCollectionGroup(collectionId) {
	const { projectId, apiKey } = await firebaseConfig();
	const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			structuredQuery: { from: [{ collectionId, allDescendants: true }] },
		}),
	});
	if (!response.ok) {
		throw new Error(
			`Firestore ${response.status} querying ${collectionId}`
		);
	}
	const rows = await response.json();

	return rows.filter((row) => row.document).map((row) => row.document);
}

async function loadAlbums() {
	const documents = await queryCollectionGroup('album');

	return documents
		.map((document) => {
			const fields = document.fields ?? {};
			const artist = fields.artist?.mapValue?.fields ?? {};

			return {
				uid: document.name.split('/').pop(),
				/** Document path relative to the database root. */
				path: document.name.split('/documents/')[1],
				name: fields.name?.stringValue ?? '',
				artistName: artist.name?.stringValue ?? '',
				year: yearOf(fields.year),
				format: fields.format?.stringValue ?? null,
			};
		})
		.filter((album) => album.name && album.artistName)
		.sort(
			(a, b) =>
				a.artistName.localeCompare(b.artistName) ||
				(a.year ?? 0) - (b.year ?? 0)
		);
}

const cacheFile = (albumUid) => join(ALBUM_CACHE, `${albumUid}.json`);

/** Finds the album on Discogs: master first, a single release as fallback. */
async function findOnDiscogs(client, album) {
	for (const type of ['master', 'release']) {
		const search = await client.get('/database/search', {
			type,
			artist: album.artistName,
			release_title: album.name,
			per_page: 25,
		});
		const candidates = rankCandidates(album, search?.results ?? []);

		if (candidates.length) {
			const best = candidates[0];
			const tied = candidates.filter((c) => c.score === best.score);

			return {
				status:
					tied.length > 1 && type === 'master'
						? 'ambiguous'
						: 'matched',
				type,
				masterId: type === 'master' ? best.id : null,
				releaseId: type === 'release' ? best.id : null,
				score: best.score,
				candidates: candidates.slice(0, 5),
			};
		}
	}
	return { status: 'unmatched', candidates: [] };
}

async function fetchCommand() {
	const client = new DiscogsClient();
	await mkdir(ALBUM_CACHE, { recursive: true });

	let albums = await loadAlbums();
	if (options.album) {
		albums = albums.filter((album) => album.uid === options.album);
	}
	if (options.limit) {
		albums = albums.slice(0, Number(options.limit));
	}

	console.log(
		`${albums.length} albums, Discogs ${
			client.authenticated
				? 'authenticated (60/min)'
				: 'anonymous (25/min)'
		}`
	);

	let done = 0;
	for (const album of albums) {
		done++;
		const file = cacheFile(album.uid);
		if (!options.refresh && existsSync(file)) {
			continue;
		}

		const label = `[${done}/${albums.length}] ${album.artistName} — ${album.name}`;
		try {
			const match = await findOnDiscogs(client, album);
			let release = null;

			if (match.status !== 'unmatched') {
				if (match.masterId) {
					const master = await client.get(
						`/masters/${match.masterId}`
					);
					match.releaseId = master?.main_release ?? null;
				}
				if (match.releaseId) {
					const raw = await client.get(
						`/releases/${match.releaseId}`
					);
					release = raw ? trimRelease(raw) : null;
				}
			}

			await writeFile(
				file,
				JSON.stringify(
					{
						album,
						match,
						release,
						fetchedAt: new Date().toISOString(),
					},
					null,
					2
				)
			);
			console.log(
				`${label}: ${match.status}${
					release
						? ` (release ${release.id}, ${release.tracklist.length} tracks, ${release.extraartists.length} credits)`
						: ''
				}`
			);
		} catch (error) {
			console.error(`${label}: ERROR ${error.message}`);
		}
	}

	await writeReport();
}

/**
 * Refreshes the cached albums' years from Firestore and downloads each band's
 * Discogs artist profile (member list with the active flag).
 */
async function fetchArtistsCommand() {
	const client = new DiscogsClient();
	await mkdir(ARTIST_CACHE, { recursive: true });

	const fresh = new Map(
		(await loadAlbums()).map((album) => [album.uid, album])
	);
	const cached = await readCache();
	for (const entry of cached) {
		const album = fresh.get(entry.album.uid);
		if (
			album &&
			(album.year !== entry.album.year || album.path !== entry.album.path)
		) {
			entry.album = { ...entry.album, ...album };
			await writeFile(
				cacheFile(album.uid),
				JSON.stringify(entry, null, 2)
			);
		}
	}

	const bands = new Map();
	for (const entry of cached.filter((e) => e.release)) {
		const artistUid = entry.album.path?.split('/')[1];
		if (!artistUid) continue;
		const band = bands.get(artistUid) ?? {
			name: entry.album.artistName,
			entries: [],
		};
		band.entries.push(entry);
		bands.set(artistUid, band);
	}

	let done = 0;
	for (const [artistUid, band] of bands) {
		done++;
		const file = join(ARTIST_CACHE, `${artistUid}.json`);
		if (!options.refresh && existsSync(file)) continue;

		const discogsId = bandDiscogsId(band.entries);
		const label = `[${done}/${bands.size}] ${band.name}`;
		try {
			const artist = discogsId
				? await client.get(`/artists/${discogsId}`)
				: null;
			const profile = artist
				? {
						id: artist.id,
						name: artist.name,
						members: (artist.members ?? []).map((m) => ({
							id: m.id,
							name: m.name,
							active: !!m.active,
						})),
					}
				: null;
			await writeFile(
				file,
				JSON.stringify(
					{
						artistUid,
						discogsId,
						...profile,
						fetchedAt: new Date().toISOString(),
					},
					null,
					2
				)
			);
			console.log(
				`${label}: ${profile ? `${profile.members.length} members` : 'no Discogs artist'}`
			);
		} catch (error) {
			console.error(`${label}: ERROR ${error.message}`);
		}
	}
}

async function readCache() {
	if (!existsSync(ALBUM_CACHE)) {
		return [];
	}
	const files = (await readdir(ALBUM_CACHE)).filter((f) =>
		f.endsWith('.json')
	);
	return Promise.all(
		files.map(async (f) =>
			JSON.parse(await readFile(join(ALBUM_CACHE, f), 'utf8'))
		)
	);
}

async function writeReport() {
	const entries = await readCache();
	const byStatus = (status) =>
		entries
			.filter((entry) => entry.match.status === status)
			.map((entry) => ({
				uid: entry.album.uid,
				artist: entry.album.artistName,
				album: entry.album.name,
				year: entry.album.year,
				candidates: entry.match.candidates,
			}));

	const report = {
		generatedAt: new Date().toISOString(),
		total: entries.length,
		matched: entries.filter((e) => e.match.status === 'matched').length,
		ambiguous: byStatus('ambiguous'),
		unmatched: byStatus('unmatched'),
		withoutTracks: entries
			.filter((e) => e.release && !e.release.tracklist.length)
			.map((e) => e.album.uid),
	};
	await writeFile(
		join(CACHE, 'report.json'),
		JSON.stringify(report, null, 2)
	);

	console.log(
		`\nReport: ${report.total} cached, ${report.matched} matched, ` +
			`${report.ambiguous.length} ambiguous, ${report.unmatched.length} unmatched ` +
			`→ tools/discogs/.cache/report.json`
	);
}

/** A value counts as missing when it is absent, null, empty text or an empty list. */
const isMissing = (value) =>
	value === undefined ||
	value === null ||
	value === '' ||
	(Array.isArray(value) && value.length === 0);

/**
 * Fields of `incoming` that `existing` does not have yet. One level deep for
 * maps (e.g. `discogs`), so a partly filled map is completed, never replaced.
 */
function missingFields(existing, incoming) {
	const patch = {};

	for (const [key, value] of Object.entries(incoming)) {
		const current = existing?.[key];

		if (isMissing(current)) {
			if (!isMissing(value)) {
				patch[key] = value;
			}
		} else if (
			current &&
			typeof current === 'object' &&
			!Array.isArray(current) &&
			value &&
			typeof value === 'object' &&
			!Array.isArray(value)
		) {
			for (const [subKey, subValue] of Object.entries(value)) {
				if (isMissing(current[subKey]) && !isMissing(subValue)) {
					patch[`${key}.${subKey}`] = subValue;
				}
			}
		}
	}
	return patch;
}

const contributionKey = (contribution) =>
	[
		contribution.musicianUid,
		String(contribution.role ?? '').toLowerCase(),
		String(contribution.roleDetail ?? '').toLowerCase(),
	].join('|');

/**
 * Operations for one album. Default (fill): create what is missing and add
 * missing fields to existing documents; never overwrite or delete. With
 * --replace the album's previously imported Discogs data is replaced.
 */
async function planAlbum(db, item, replace) {
	const ops = [];
	const stats = { created: 0, completed: 0, unchanged: 0, skipped: [] };
	const byAlbum = (collection) =>
		db.collection(collection).where('albumUid', '==', item.album.uid).get();

	const [trackSnap, contributionSnap, albumSnap] = await Promise.all([
		byAlbum('track'),
		byAlbum('contribution'),
		db.doc(item.album.path).get(),
	]);
	const musicianSnaps = item.musicians.length
		? await db.getAll(
				...item.musicians.map((m) =>
					db.collection('musician').doc(m.uid)
				)
			)
		: [];

	/** Create a missing document, or complete an existing one. */
	const upsert = (ref, existing, data) => {
		if (!existing) {
			ops.push({ type: 'create', ref, data });
			stats.created++;
			return;
		}
		const patch = missingFields(existing, data);
		if (Object.keys(patch).length) {
			ops.push({ type: 'update', ref, data: patch });
			stats.completed++;
		} else {
			stats.unchanged++;
		}
	};

	if (replace) {
		for (const snap of [trackSnap, contributionSnap]) {
			snap.docs
				.filter((doc) => doc.get('source') === 'discogs')
				.forEach((doc) => ops.push({ type: 'delete', ref: doc.ref }));
		}
		item.tracks.forEach((track) =>
			ops.push({
				type: 'set',
				ref: db.collection('track').doc(track.uid),
				data: track,
			})
		);
		item.contributions.forEach((contribution) =>
			ops.push({
				type: 'set',
				ref: db.collection('contribution').doc(contribution.uid),
				data: contribution,
			})
		);
		item.musicians.forEach((musician) =>
			ops.push({
				type: 'set',
				ref: db.collection('musician').doc(musician.uid),
				data: musician,
			})
		);
		ops.push({
			type: 'update',
			ref: albumSnap.ref,
			data: { discogs: item.discogs },
		});
		return { ops, stats: { replaced: true } };
	}

	// Tracks: a tracklist maintained by hand is left alone entirely.
	const manualTracks = trackSnap.docs.filter(
		(doc) => doc.get('source') !== 'discogs'
	);
	if (manualTracks.length) {
		stats.skipped.push(
			`tracks (${manualTracks.length} existing, not from Discogs)`
		);
	} else {
		const existing = new Map(
			trackSnap.docs.map((doc) => [doc.id, doc.data()])
		);
		for (const track of item.tracks) {
			upsert(
				db.collection('track').doc(track.uid),
				existing.get(track.uid),
				track
			);
		}
	}

	// Contributions: skip a credit the album already has from any source.
	const existingById = new Map(
		contributionSnap.docs.map((doc) => [doc.id, doc.data()])
	);
	const existingKeys = new Set(
		contributionSnap.docs
			.filter((doc) => doc.get('source') !== 'discogs')
			.map((doc) => contributionKey(doc.data()))
	);
	for (const contribution of item.contributions) {
		if (existingKeys.has(contributionKey(contribution))) {
			stats.unchanged++;
			continue;
		}
		upsert(
			db.collection('contribution').doc(contribution.uid),
			existingById.get(contribution.uid),
			contribution
		);
	}

	// Musicians: create new ones, only complete known ones.
	item.musicians.forEach((musician, index) => {
		const snap = musicianSnaps[index];
		upsert(snap.ref, snap.exists ? snap.data() : undefined, musician);
	});

	// Album: add the original release, completing a partial `discogs` map.
	if (!albumSnap.exists) {
		stats.skipped.push('album document not found');
	} else {
		const patch = missingFields(albumSnap.data(), {
			discogs: item.discogs,
		});
		if (Object.keys(patch).length) {
			ops.push({ type: 'update', ref: albumSnap.ref, data: patch });
			stats.completed++;
		} else {
			stats.unchanged++;
		}
	}

	return { ops, stats };
}

/**
 * Writes operations in bulk; returns the writes that failed for good. Stamps
 * `updatedAt`, leaves tombstones and bumps the catalog version, so the app's
 * client cache picks the changes up.
 */
async function writeOps(db, ops) {
	const { featureKeyOf, stamp, tombstone, touchCatalog } = await import(
		'../sync/catalog-sync.mjs'
	);
	const writer = db.bulkWriter();
	const failures = [];
	writer.onWriteError((error) => {
		// Quota and permission errors will not heal by retrying.
		const fatal = [7, 8].includes(error.code); // PERMISSION_DENIED, RESOURCE_EXHAUSTED
		if (fatal || error.failedAttempts >= 3) {
			failures.push(`${error.documentRef.path}: ${error.message}`);
			return false;
		}
		return true;
	});
	for (const op of ops) {
		if (op.type === 'create') writer.create(op.ref, stamp(op.data));
		if (op.type === 'set') writer.set(op.ref, stamp(op.data));
		if (op.type === 'update') writer.update(op.ref, stamp(op.data));
		if (op.type === 'delete') {
			const deletion = tombstone(db, op.ref);
			writer.delete(op.ref);
			writer.set(deletion.ref, deletion.data);
		}
	}
	await writer.close();
	// After the writes: the version must not be older than what it covers.
	await touchCatalog(db, [...new Set(ops.map((op) => featureKeyOf(op.ref)))]);
	return failures;
}

/**
 * Operations for one band's line-up: `membership` documents, `musician`
 * documents for members not known yet, and the band's Discogs id on the
 * artist document. Fill mode keeps hand-edited values (e.g. corrected years).
 */
async function planArtist(db, band, memberships, discogsArtistId, replace) {
	const ops = [];
	const stats = { created: 0, completed: 0, unchanged: 0 };

	const membershipRefs = memberships.map((m) =>
		db.collection('membership').doc(m.uid)
	);
	const musicianRefs = memberships.map((m) =>
		db.collection('musician').doc(m.musicianUid)
	);
	const artistRef = db.doc(`artist/${band.artistUid}`);
	const [membershipSnaps, musicianSnaps, artistSnap] = await Promise.all([
		membershipRefs.length ? db.getAll(...membershipRefs) : [],
		musicianRefs.length ? db.getAll(...musicianRefs) : [],
		artistRef.get(),
	]);

	const upsert = (ref, snap, data) => {
		if (replace) {
			ops.push({ type: 'set', ref, data });
			return;
		}
		if (!snap?.exists) {
			ops.push({ type: 'create', ref, data });
			stats.created++;
			return;
		}
		const patch = missingFields(snap.data(), data);
		if (Object.keys(patch).length) {
			ops.push({ type: 'update', ref, data: patch });
			stats.completed++;
		} else {
			stats.unchanged++;
		}
	};

	memberships.forEach((membership, index) => {
		upsert(membershipRefs[index], membershipSnaps[index], membership);
	});

	const seen = new Set();
	memberships.forEach((membership, index) => {
		if (seen.has(membership.musicianUid)) return;
		seen.add(membership.musicianUid);
		// Replace mode never replaces musicians: they are shared by albums.
		const snap = musicianSnaps[index];
		const data = {
			uid: membership.musicianUid,
			name: membership.musicianName,
			discogsId:
				Number(membership.musicianUid.replace('discogs-', '')) || null,
			entityType: 'Musician',
			source: 'discogs',
		};
		if (!snap.exists) {
			ops.push({ type: 'create', ref: snap.ref, data });
			stats.created++;
		} else {
			const patch = missingFields(snap.data(), data);
			if (Object.keys(patch).length) {
				ops.push({ type: 'update', ref: snap.ref, data: patch });
				stats.completed++;
			} else {
				stats.unchanged++;
			}
		}
	});

	if (artistSnap.exists && discogsArtistId) {
		const patch = missingFields(artistSnap.data(), {
			discogs: { artistId: discogsArtistId },
		});
		if (Object.keys(patch).length) {
			ops.push({ type: 'update', ref: artistRef, data: patch });
			stats.completed++;
		}
	}

	return { ops, stats };
}

async function writeCommand() {
	const cached = await readCache();
	let entries = cached.filter(
		(entry) =>
			entry.release &&
			(entry.match.status === 'matched' ||
				(options['include-ambiguous'] &&
					entry.match.status === 'ambiguous'))
	);
	if (options.album) {
		entries = entries.filter((entry) => entry.album.uid === options.album);
	}
	const excluded = cached.length - entries.length;
	if (excluded && !options.album) {
		console.log(
			`${excluded} cached albums left out (unmatched${
				options['include-ambiguous'] ? '' : ' or ambiguous'
			} — see report.json)`
		);
	}

	const plan = entries.map((entry) => ({
		album: entry.album,
		tracks: toTrackDocs(entry.album.uid, entry.release),
		...toCreditDocs(entry.album.uid, entry.release),
		discogs: toOriginalRelease(entry.match, entry.release),
	}));

	const mode = options.replace ? 'replace' : 'fill (existing data is kept)';
	console.log(
		`${plan.length} albums, mode: ${mode}${options.confirm ? '' : ', DRY RUN'}`
	);

	const { initializeApp, applicationDefault } =
		await import('firebase-admin/app');
	const { getFirestore } = await import('firebase-admin/firestore');
	const { projectId } = await firebaseConfig();
	initializeApp({ credential: applicationDefault(), projectId });
	const db = getFirestore();

	const totals = { created: 0, completed: 0, unchanged: 0, operations: 0 };

	for (const item of options['memberships-only'] ? [] : plan) {
		const label = `${item.album.artistName} — ${item.album.name}`;
		const { ops, stats } = await planAlbum(db, item, options.replace);
		totals.operations += ops.length;

		if (stats.replaced) {
			console.log(`${label}: replace (${ops.length} operations)`);
		} else {
			totals.created += stats.created;
			totals.completed += stats.completed;
			totals.unchanged += stats.unchanged;
			console.log(
				`${label}: ${stats.created} new, ${stats.completed} completed, ` +
					`${stats.unchanged} unchanged` +
					(stats.skipped.length
						? `; skipped: ${stats.skipped.join(', ')}`
						: '')
			);
		}

		if (!options.confirm || !ops.length) {
			continue;
		}
		const failures = await writeOps(db, ops);

		if (failures.length) {
			totals.failed = (totals.failed ?? 0) + failures.length;
			console.error(
				`  ${failures.length} writes failed, first: ${failures[0]}`
			);
			if (failures.some((f) => /RESOURCE_EXHAUSTED|quota/i.test(f))) {
				console.error(
					'\nFirestore quota exhausted — stopping. Re-run the same command later: ' +
						'fill mode continues where it stopped.'
				);
				process.exitCode = 1;
				break;
			}
		}
	}

	// Line-ups, from the same unambiguous album matches.
	const bands = new Map();
	for (const entry of entries) {
		const artistUid = entry.album.path?.split('/')[1];
		if (!artistUid) continue;
		const band = bands.get(artistUid) ?? {
			artistUid,
			artistName: entry.album.artistName,
			entries: [],
		};
		band.entries.push(entry);
		bands.set(artistUid, band);
	}

	for (const band of process.exitCode ? [] : bands.values()) {
		const profileFile = join(ARTIST_CACHE, `${band.artistUid}.json`);
		const profile = existsSync(profileFile)
			? JSON.parse(await readFile(profileFile, 'utf8'))
			: null;
		const memberships = toMembershipDocs(band, band.entries, profile);
		const { ops, stats } = await planArtist(
			db,
			band,
			memberships,
			profile?.id ?? null,
			options.replace
		);
		totals.operations += ops.length;
		totals.created += stats.created;
		totals.completed += stats.completed;
		totals.unchanged += stats.unchanged;
		const members = memberships.filter((m) => m.kind === 'member').length;
		console.log(
			`${band.artistName} line-up: ${members} members, ${memberships.length - members} guests` +
				(profile
					? ''
					: ' (no Discogs member list — run fetch-artists)') +
				` → ${stats.created} new, ${stats.completed} completed, ${stats.unchanged} unchanged`
		);

		if (!options.confirm || !ops.length) continue;
		const failures = await writeOps(db, ops);
		if (failures.length) {
			totals.failed = (totals.failed ?? 0) + failures.length;
			console.error(
				`  ${failures.length} writes failed, first: ${failures[0]}`
			);
			if (failures.some((f) => /RESOURCE_EXHAUSTED|quota/i.test(f))) {
				console.error(
					'\nFirestore quota exhausted — stopping; re-run later.'
				);
				process.exitCode = 1;
				break;
			}
		}
	}

	console.log(
		`\n${options.replace ? '' : `${totals.created} new, ${totals.completed} completed, ${totals.unchanged} unchanged; `}` +
			`${totals.operations} operations ${options.confirm ? 'written' : 'planned — nothing written, re-run with --confirm'}${totals.failed ? `, ${totals.failed} FAILED` : ''}`
	);
}

const command = positionals[0];
if (command === 'fetch') {
	await fetchCommand();
} else if (command === 'fetch-artists') {
	await fetchArtistsCommand();
} else if (command === 'write') {
	try {
		await writeCommand();
	} catch (error) {
		if (
			/invalid_grant|invalid_rapt|Could not load the default credentials|PERMISSION_DENIED/i.test(
				String(error?.message)
			)
		) {
			console.error(
				'\nFirestore access failed: ' +
					String(error.message).split('\n')[0] +
					'\nSign in again with `gcloud auth application-default login` ' +
					'(an account with access to the Firebase project), then re-run.'
			);
			process.exitCode = 1;
		} else {
			throw error;
		}
	}
} else if (command === 'report') {
	await writeReport();
} else {
	console.log(
		'Usage: import-discogs.mjs <fetch|fetch-artists|write|report> [--limit N] [--album UID] [--refresh] [--confirm] [--replace] [--memberships-only]'
	);
	process.exitCode = 1;
}
