#!/usr/bin/env node
/**
 * Empties the Firebase emulators of `firebase.e2e.json` and writes the small
 * world the end-to-end tests run against (apps/music-collection-e2e).
 *
 *   node tools/e2e/seed-emulator.mjs
 *
 * Emulator only. It refuses to start unless FIRESTORE_EMULATOR_HOST and
 * FIREBASE_AUTH_EMULATOR_HOST are set (`firebase emulators:exec` sets them,
 * and so does the Cypress task that calls `seed()` before every test) and the
 * project is a `demo-` one, which no real project can be. No credentials are
 * read, so it could not reach the dev or the prod project even by mistake.
 *
 * What it writes, and why:
 *   - a two-band, three-album rock catalog (one UK vinyl pressing per
 *     album) with its genre taxonomy, and one
 *     published collection, so the guest home page has a big card to draw;
 *   - `sync/catalog`: a stamp for every catalog feature, but **no bundles** —
 *     the client then reads the features straight from Firestore, which is
 *     the path a missing bundle takes in production too;
 *   - two accounts in the Auth emulator (`collector`, `admin`, password
 *     `e2e-password`) with their `user/{uid}` documents;
 *   - the `USER` and `admin` roles and, for each account, the
 *     `security/users/{uid}/effective_permissions` document **written
 *     directly**. In the real projects a function computes it
 *     (apps/functions — syncUserPermissions); the functions emulator is not
 *     started for the tests, so the seed writes the result the function would.
 *     The `USER` permissions are read out of `tools/sync/seed-user-role.mjs`,
 *     the list `permission-catalog.spec.ts` holds against the app.
 *
 * The writes go through `catalog-sync.mjs`'s `stamp`, as every tool script's
 * do, so the documents carry the `updatedAt` the client sync expects.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { CATALOG_FEATURE_KEYS, stamp } from '../sync/catalog-sync.mjs';

export const PROJECT_ID = 'demo-music-collection';
export const PASSWORD = 'e2e-password';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The seeded accounts; the e2e tests sign in by these keys. */
export const ACCOUNTS = {
	collector: {
		uid: 'e2e-collector',
		displayName: 'Erika Collector',
		roleIds: ['USER'],
		genres: ['rock'],
	},
	admin: {
		uid: 'e2e-admin',
		displayName: 'Adam Admin',
		roleIds: ['USER', 'admin'],
		genres: null,
	},
};

const searchParameters = (name) => {
	const lower = String(name ?? '').toLowerCase();

	return Array.from(lower, (_, index) => lower.slice(0, index + 1));
};

/** Local midnight of January 1st, as the catalog keeps its year-only dates. */
const yearStart = (year) => new Date(year, 0, 1);

const STYLES = ['Doom', 'Heavy metal', 'Thrash'];

export const ARTISTS = [
	{
		uid: 'e2e-iron-lantern',
		name: 'Iron Lantern',
		country: 'UK',
		formedIn: 1979,
		styles: ['Heavy metal'],
		description: 'A made-up British heavy metal band for the end-to-end tests.',
		albums: [
			{ uid: 'e2e-midnight-forge', name: 'Midnight Forge', year: 1983, styles: ['Heavy metal'], colour: '#8a2b1d' },
			{ uid: 'e2e-ash-and-ember', name: 'Ash and Ember', year: 1985, styles: ['Heavy metal'], colour: '#c47a1c' },
		],
	},
	{
		uid: 'e2e-granite-choir',
		name: 'Granite Choir',
		country: 'Sweden',
		formedIn: 1988,
		styles: ['Doom'],
		description: 'A made-up Swedish doom band for the end-to-end tests.',
		albums: [{ uid: 'e2e-slow-tide', name: 'Slow Tide', year: 1991, styles: ['Doom'], colour: '#3d4a5c' }],
	},
];

function artistDocument(artist) {
	return {
		uid: artist.uid,
		entityType: 'Artist',
		name: artist.name,
		searchParameters: searchParameters(artist.name),
		artistType: 'band',
		country: artist.country,
		description: artist.description,
		formedIn: yearStart(artist.formedIn).toISOString(),
		genre: 'Rock',
		styles: artist.styles,
		sites: [],
		source: 'seed',
	};
}

/**
 * A sleeve drawn in place: a flat square of the album's colour. Inline, so
 * the tests fetch nothing from outside (and nothing breaks offline), but the
 * pages still draw a cover where a record has one.
 */
function cover(colour) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="${colour}"/></svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function albumDocument(album, artist) {
	return {
		uid: album.uid,
		entityType: 'Album',
		name: album.name,
		searchParameters: searchParameters(album.name),
		artist: {
			uid: artist.uid,
			entityType: 'Artist',
			name: artist.name,
			searchParameters: searchParameters(artist.name),
		},
		coverImage: null,
		coverImageUrl: cover(album.colour),
		format: 'lp',
		genre: 'Rock',
		styles: album.styles,
		songs: [],
		hasTracks: false,
		year: yearStart(album.year).getTime(),
		spotifyAlbumId: null,
		youtubePlaylistId: null,
		youtubeVideoIds: [],
	};
}

/**
 * One pressing of the album: what a collector picks in the album page's
 * "which pressing do you have" list. A pressing, not the album's generic
 * release — the generic one is made by a callable (`ensureGenericRelease`),
 * and the tests run without the functions emulator.
 */
function releaseDocument(album, artist) {
	const { hasTracks: _hasTracks, ...embedded } = albumDocument(album, artist);

	return {
		uid: `${album.uid}-uk`,
		entityType: 'Release',
		generic: false,
		name: album.name,
		album: embedded,
		artist: { uid: artist.uid, entityType: 'Artist', name: artist.name },
		catno: `E2E ${album.year}`,
		country: 'UK',
		date: yearStart(album.year).getTime(),
		formatDescription: null,
		label: null,
		media: 'vinyl',
		discogsReleaseId: null,
		searchParameters: searchParameters(album.name),
	};
}

const COLLECTION = {
	entityType: 'Music Collection',
	uid: 'e2e-heavy-metal',
	slug: 'e2e-heavy-metal',
	name: 'Heavy Metal Forge',
	description: 'The heavy metal LPs of the end-to-end catalog.',
	icon: 'pi pi-bolt',
	coverImageUrl: null,
	basePoints: null,
	status: 'published',
	visibility: 'public',
	group: null,
	parentUid: null,
	criteria: {
		styles: { includesAny: ['Heavy metal'] },
		albumFormats: { includesAny: ['lp'] },
	},
	badge: {
		name: 'Forge Keeper',
		description: 'Own every heavy metal LP of the end-to-end catalog.',
		icon: 'pi pi-bolt',
		artworkUrl: null,
	},
	createdAt: Date.UTC(2026, 0, 1),
	criteriaVersion: 1,
};

/** The collector's base rights, out of the script that seeds them for real. */
async function userPermissions() {
	const source = await readFile(join(ROOT, 'tools/sync/seed-user-role.mjs'), 'utf8');
	const list = source.match(/const PERMISSIONS = \[([\s\S]*?)\];/);

	if (!list) {
		throw new Error('PERMISSIONS not found in tools/sync/seed-user-role.mjs');
	}

	return [...list[1].matchAll(/'([A-Za-z]+)'/g)].map(([, name]) => name);
}

function assertEmulator() {
	for (const variable of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
		if (!process.env[variable]) {
			throw new Error(
				`${variable} is not set — this script only ever writes to the emulators (firebase.e2e.json)`
			);
		}
	}
	if (!PROJECT_ID.startsWith('demo-')) {
		throw new Error(`${PROJECT_ID} is not a demo project`);
	}
}

/** Drops every document and every account the emulators hold. */
async function clear() {
	const firestore = process.env.FIRESTORE_EMULATOR_HOST;
	const auth = process.env.FIREBASE_AUTH_EMULATOR_HOST;
	const responses = await Promise.all([
		fetch(
			`http://${firestore}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
			{ method: 'DELETE' }
		),
		fetch(`http://${auth}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
			method: 'DELETE',
		}),
	]);

	for (const response of responses) {
		if (!response.ok) {
			throw new Error(`clearing the emulator failed: ${response.status} ${response.url}`);
		}
	}
}

export async function seed() {
	assertEmulator();
	await clear();

	const app = initializeApp({ projectId: PROJECT_ID }, `e2e-seed-${Date.now()}`);

	try {
		const db = getFirestore(app);
		const auth = getAuth(app);
		const batch = db.batch();
		const set = (path, data) => batch.set(db.doc(path), stamp(data));

		set('genre/rock', {
			uid: 'rock',
			slug: 'rock',
			entityType: 'Genre',
			name: 'Rock',
			active: true,
			description: 'Rock and everything that grew out of it.',
			styles: STYLES,
		});

		for (const artist of ARTISTS) {
			set(`artist/${artist.uid}`, artistDocument(artist));
			for (const album of artist.albums) {
				set(`artist/${artist.uid}/album/${album.uid}`, albumDocument(album, artist));
				set(
					`artist/${artist.uid}/album/${album.uid}/release/${album.uid}-uk`,
					releaseDocument(album, artist)
				);
			}
		}

		set(`music-collection/${COLLECTION.uid}`, COLLECTION);

		const roles = {
			USER: await userPermissions(),
			admin: ['ADMIN'],
		};

		for (const [uid, permissions] of Object.entries(roles)) {
			set(`role/${uid}`, { uid, name: uid.toUpperCase(), permissions });
		}

		for (const [key, account] of Object.entries(ACCOUNTS)) {
			const email = `${key}@e2e.test`;

			await auth.createUser({
				uid: account.uid,
				email,
				emailVerified: true,
				password: PASSWORD,
				displayName: account.displayName,
			});

			set(`user/${account.uid}`, {
				uid: account.uid,
				entityType: 'User',
				displayName: account.displayName,
				email,
				firstName: '',
				lastName: '',
				phone: '',
				photoURL: null,
				roleIds: account.roleIds,
			});

			if (account.genres) {
				batch.set(db.doc(`user/${account.uid}/setting/genre-scope`), {
					genres: account.genres,
				});
			}

			// What syncUserPermissions would write (see the header).
			batch.set(db.doc(`security/users/${account.uid}/effective_permissions`), {
				permissions: [...new Set(account.roleIds.flatMap((role) => roles[role]))].sort(),
				roles: account.roleIds.map((role) => role.toUpperCase()).sort(),
				updatedAt: FieldValue.serverTimestamp(),
			});
		}

		// Every feature stamped, none bundled: the client reads from Firestore.
		batch.set(db.doc('sync/catalog'), {
			modifiedAt: Object.fromEntries(
				CATALOG_FEATURE_KEYS.map((key) => [key, FieldValue.serverTimestamp()])
			),
		});

		await batch.commit();
	} finally {
		await deleteApp(app);
	}

	return null;
}

/** A field of a document by its dotted path (`albumReference.uid`). */
const fieldOf = (document, path) =>
	path.split('.').reduce((value, key) => value?.[key], document);

/**
 * The documents of a collection in the emulator, for a test to check what the
 * app wrote — once one of them carries every field of `where` (dotted paths),
 * or after `timeoutMs` with whatever is there: a write the page shows at once
 * may still be on its way to the server. Plain JSON: Timestamps come back as
 * `{ _seconds, _nanoseconds }`.
 */
export async function waitForDocuments(path, where = {}, timeoutMs = 15000) {
	assertEmulator();

	const app = initializeApp({ projectId: PROJECT_ID }, `e2e-read-${Date.now()}`);
	const deadline = Date.now() + timeoutMs;

	try {
		for (;;) {
			const snapshot = await getFirestore(app).collection(path).get();
			const documents = snapshot.docs.map((document) =>
				JSON.parse(JSON.stringify({ id: document.id, ...document.data() }))
			);
			const found = documents.some((document) =>
				Object.entries(where).every(([field, value]) => fieldOf(document, field) === value)
			);

			if (found || Date.now() > deadline) {
				return documents;
			}

			await new Promise((resolve) => setTimeout(resolve, 250));
		}
	} finally {
		await deleteApp(app);
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await seed();
	console.log(`seeded ${PROJECT_ID}: ${ARTISTS.length} artists, ${Object.keys(ACCOUNTS).length} accounts`);
}
