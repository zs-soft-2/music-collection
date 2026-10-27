#!/usr/bin/env node
/**
 * Mock collectors: one per seeded genre, each with a shelf, a genre scope of
 * their own and a public page.
 *
 *   node tools/sync/seed-mock-collectors.mjs [--env dev|prod] [--confirm]
 *     [--genres jazz,reggae] [--force] [--remove]
 *
 * The app had one real collector, so the collectors' wall, the map and the
 * collection pages all showed a single shelf — all of it rock. These six
 * stand next to it: a jazz collector in Budapest, a dub collector in Berlin,
 * and so on, each scoped to their own genre
 * (`user/{uid}/setting/genre-scope`), so the genre narrowing has something to
 * narrow to.
 *
 * They have no Auth account. Nobody signs in as them: what makes them
 * visible is the public profile they publish (`collector/{uid}`,
 * `collector-card/{uid}`) and the map pin (`user-location/{uid}`) — the same
 * documents a real collector's browser writes. Their copies, settings and
 * wishes live under `user/{uid}` where the rules keep them private, exactly
 * as a real collector's do.
 *
 * What it writes, per collector:
 *   - `user/mock-{slug}` and the settings a shared profile needs,
 *   - `user/…/collection-item/…`, each on a generic release of the album
 *     (`generic-{albumUid}-{media}`), created here if it does not exist —
 *     the same document `ensureGenericRelease` would create,
 *   - `user/…/wishlist-item/…`,
 *   - `collector/{uid}` + `collector/{uid}/albums/all`, `collector-card/{uid}`
 *     and `user-location/{uid}`.
 *
 * The points and badges are computed the way the client computes them
 * (`music-collection-score.ts`): a collection earns nothing until it is
 * complete, and the shelf raises what a complete one is worth. The script
 * resolves each seeded collection against the seeded albums itself and says
 * so when a collector it expected to have finished one has not — a public
 * page that claims a badge nobody earned is worse than no page.
 *
 * `--remove` deletes all of it again (the generic releases stay in the
 * catalog; `seed-genre-catalog.mjs --remove` takes those). Needs Firebase
 * Admin credentials; `--confirm` to write.
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { ENV_OPTION, readEnvironment } from './environment.mjs';
import { featureKeyOf, stamp, tombstone, touchCatalog } from './catalog-sync.mjs';
import { searchParameters } from '../discogs/discogs-mapping.mjs';
import {
	GENRE_SEED,
	seedUid,
} from '../catalog/genre-seed-data.mjs';

const USER_COLLECTION = 'user';
const COLLECTOR_COLLECTION = 'collector';
const COLLECTOR_CARD_COLLECTION = 'collector-card';
const USER_LOCATION_COLLECTION = 'user-location';
const COLLECTION_ITEM_COLLECTION = 'collection-item';
const WISHLIST_ITEM_COLLECTION = 'wishlist-item';
const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';
const RELEASE_COLLECTION = 'release';

/**
 * The scoring constants of `music-collection-score.ts`. Copied, because a
 * tool script cannot import the library (`tools/` is plain ESM, the engine is
 * TypeScript inside the Nx graph) — if the engine's formula changes, the
 * numbers these pages show go stale until this script is run again.
 */
const POINTS_PER_ALBUM = 10;
const SIZE_SCALE = 50;
const VINTAGE_YEARS = 40;
const ORIGINAL_PRESSING_FACTOR = 0.4;
const MAX_PRESSING_FACTOR = 0.5;
/** How many records the public page's shop window holds. */
const SHOWCASE_LIMIT = 24;
/** How many sleeves the directory entry carries (`CARD_RECORD_LIMIT`). */
const CARD_RECORD_LIMIT = 4;

/**
 * The collections whose writes the client sync follows by collection id —
 * `CATALOG_FEATURE_KEYS` plus the public documents the deletion-marker rule
 * names. The settings are not among them: each setting carries a feature key
 * of its own (`genre-scope-setting`), so a version bump or a tombstone under
 * `sync/setting` would answer to nothing.
 */
const SYNCED_FEATURE_KEYS = new Set([
	'user',
	COLLECTION_ITEM_COLLECTION,
	WISHLIST_ITEM_COLLECTION,
	COLLECTOR_COLLECTION,
	COLLECTOR_CARD_COLLECTION,
	USER_LOCATION_COLLECTION,
]);

/** The feature keys of these refs the sync knows about, deduplicated. */
const syncedFeatures = (refs) => [
	...new Set(refs.map(featureKeyOf).filter((key) => SYNCED_FEATURE_KEYS.has(key))),
];

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
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
const now = Date.now();

console.log(
	`${projectId}: mock collectors — ${genres.map(({ slug }) => slug).join(', ')}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

/** Document id of a mock collector: what `/collector/:uid` is reached by. */
const collectorUid = (slug) => `mock-${slug}`;

const albumRef = (artistSlug, albumSlug) =>
	db
		.collection(ARTIST_COLLECTION)
		.doc(seedUid(artistSlug))
		.collection(ALBUM_COLLECTION)
		.doc(seedUid(albumSlug));

if (options.remove) {
	await remove();
	process.exit(0);
}

/** Age, from nothing for this year's record to one at forty years. */
function ageWeight(year) {
	if (year === null || year === undefined) {
		return 0;
	}

	const age = new Date(now).getFullYear() - year;

	return age <= 0 ? 0 : Math.min(1, age / VINTAGE_YEARS);
}

/** What the rule says a collection is worth, before any shelf is weighed. */
function derivedBasePoints(albums) {
	const weight = albums.reduce((sum, album) => sum + 1 + ageWeight(album.year), 0);

	return Math.round(POINTS_PER_ALBUM * weight * (1 + albums.length / SIZE_SCALE));
}

/**
 * Whether a criterion matches an album. The subset the seeded definitions
 * use — styles, years and the album format — resolved the way the engine
 * resolves them (`music-collection-criteria.ts`).
 */
function matches(criteria, album) {
	const styles = criteria.styles?.includesAny ?? null;
	const formats = criteria.albumFormats?.includesAny ?? null;

	if (styles && !album.styles.some((style) => styles.includes(style))) {
		return false;
	}
	if (formats && !formats.includes(album.format ?? 'lp')) {
		return false;
	}
	if (criteria.years?.from !== undefined && album.year < criteria.years.from) {
		return false;
	}
	if (criteria.years?.to !== undefined && album.year > criteria.years.to) {
		return false;
	}

	return true;
}

/**
 * Every seeded album, in one list: a collection resolves over the whole
 * catalog, not over one genre, so this is the pool each definition is
 * matched against.
 *
 * The rock albums already in the catalog are not in it, and do not need to
 * be: every style these definitions name belongs to exactly one genre of the
 * taxonomy (see `genre-seed-data.mjs`), so no rock record can match one.
 */
const pool = GENRE_SEED.flatMap(({ genre, artists }) =>
	artists.flatMap((artist) =>
		artist.albums.map((album) => ({
			...album,
			genre,
			artist,
			uid: seedUid(album.slug),
		}))
	)
);

/** The seeded albums as the catalog now holds them, for the cover and a check. */
const albums = new Map();
const missing = [];

for (const album of pool) {
	const snapshot = await albumRef(album.artist.slug, album.slug).get();

	if (!snapshot.exists) {
		missing.push(`${album.artist.name} — ${album.name}`);
		continue;
	}

	albums.set(album.slug, {
		...album,
		coverUrl: snapshot.get('coverImageUrl') ?? null,
	});
}

if (missing.length) {
	missing.slice(0, 10).forEach((item) => console.error(`  not in the catalog: ${item}`));
	throw new Error(
		`${missing.length} seeded album(s) are missing — run seed-genre-catalog.mjs --confirm first`
	);
}

/** The definitions of a genre, resolved against the pool. */
function standings(genre, owned) {
	return genre.collections.map((collection) => {
		const criteria = {
			styles: { includesAny: collection.styles },
			...(collection.years ? { years: collection.years } : {}),
			albumFormats: { includesAny: ['lp'] },
		};
		const resolved = pool.filter((album) => matches(criteria, album));
		const held = resolved.filter((album) => owned.has(album.slug));
		const completed = resolved.length > 0 && held.length === resolved.length;
		const base = derivedBasePoints(resolved);
		const share = resolved.length ? base / resolved.length : 0;
		// Every copy here is a generic release dated to the album's own year,
		// so each owned album counts as an original pressing — which is worth
		// something only once the record is old enough.
		const bonus = held.reduce(
			(sum, album) =>
				sum +
				share *
					Math.min(
						MAX_PRESSING_FACTOR,
						ORIGINAL_PRESSING_FACTOR * ageWeight(album.year)
					),
			0
		);
		const totalPoints = base + Math.round(bonus);

		return {
			collection,
			owned: held.length,
			total: resolved.length,
			completed,
			earnedPoints: completed ? totalPoints : 0,
		};
	});
}

/** One copy, and the generic release it is a copy of. */
function toCopy(collector, copy, index) {
	const album = albums.get(copy.album);

	if (!album) {
		throw new Error(`${collector.slug}: unknown album "${copy.album}"`);
	}

	const uid = collectorUid(collector.slug);
	const albumUid = album.uid;
	const artistUid = seedUid(album.artist.slug);
	const releaseUid = `generic-${albumUid}-${copy.media}`;
	const year = album.year;
	// Local midnight of January 1st, as the catalog keeps its year-only dates.
	const albumYear = new Date(year, 0, 1).getTime();
	/**
	 * When the copy was filed. Spread over the years rather than all set to
	 * today, because the public page reports the year the collecting started
	 * and a shelf that appeared this morning says nothing.
	 */
	const addedAt = Date.UTC(2014 + (index % 11), (index * 5) % 12, 1 + (index % 27));

	const embeddedAlbum = {
		uid: albumUid,
		entityType: 'Album',
		name: album.name,
		searchParameters: searchParameters(album.name),
		artist: {
			uid: artistUid,
			entityType: 'Artist',
			name: album.artist.name,
			searchParameters: searchParameters(album.artist.name),
		},
		coverImage: null,
		coverImageUrl: album.coverUrl,
		format: album.format ?? 'lp',
		genre: album.genre,
		styles: [...album.styles].sort((one, other) => one.localeCompare(other)),
		songs: [],
		year: albumYear,
	};
	/**
	 * The generic release: the album on a medium, with nothing claimed about
	 * the pressing. Field for field what `ensureGenericRelease` writes, so a
	 * collector who later adds the same record lands on this very document.
	 */
	const release = {
		uid: releaseUid,
		entityType: 'Release',
		generic: true,
		name: album.name,
		album: embeddedAlbum,
		artist: {
			uid: artistUid,
			entityType: 'Artist',
			name: album.artist.name,
		},
		catno: null,
		country: null,
		date: albumYear,
		formatDescription: null,
		label: null,
		media: copy.media,
		discogsReleaseId: null,
		searchParameters: searchParameters(album.name),
	};

	return {
		release: {
			ref: albumRef(album.artist.slug, album.slug)
				.collection(RELEASE_COLLECTION)
				.doc(releaseUid),
			data: release,
		},
		item: {
			ref: db
				.collection(USER_COLLECTION)
				.doc(uid)
				.collection(COLLECTION_ITEM_COLLECTION)
				.doc(`seed-${collector.slug}-${copy.album}`),
			data: {
				uid: `seed-${collector.slug}-${copy.album}`,
				entityType: 'Collection Item',
				userId: uid,
				date: addedAt,
				description: copy.note ?? '',
				story: null,
				purchase: null,
				condition: null,
				serial: null,
				photos: null,
				// Left to the shelf, which files a copy in reading order.
				placement: null,
				disposal: null,
				release: { ...release, nameAndMedia: `${album.name} (${copy.media})` },
				searchParameters: searchParameters(album.name),
				artistSearchParameters: searchParameters(album.artist.name),
			},
		},
		view: {
			albumSlug: copy.album,
			title: album.name,
			artistName: album.artist.name,
			artistSlug: album.artist.slug,
			albumUid,
			year,
			coverUrl: album.coverUrl,
			format: copy.media,
			addedAt,
		},
	};
}

/** The public page, as `toPublicCollectorProfile` would build it. */
function toProfile(collector, views, resolved) {
	const uid = collectorUid(collector.slug);
	const byFormat = {};
	let oldestYear = null;
	let since = null;

	for (const view of views) {
		byFormat[view.format] = (byFormat[view.format] ?? 0) + 1;

		if (oldestYear === null || view.year < oldestYear) {
			oldestYear = view.year;
		}
		if (since === null || view.addedAt < since) {
			since = view.addedAt;
		}
	}

	const done = resolved.filter(({ completed }) => completed);
	const shown = new Set(collector.shown ?? []);

	return {
		uid,
		displayName: collector.displayName,
		countryCode: collector.countryCode,
		city: collector.city,
		numbers: {
			copies: views.length,
			albums: new Set(views.map(({ albumUid }) => albumUid)).size,
			artists: new Set(views.map(({ artistSlug }) => artistSlug)).size,
			byFormat,
			oldestYear,
			since: since === null ? null : new Date(since).getFullYear(),
		},
		points: {
			total: resolved.reduce((sum, { earnedPoints }) => sum + earnedPoints, 0),
			completedCollections: done.length,
		},
		badges: done
			.sort((one, other) => other.earnedPoints - one.earnedPoints)
			.map(({ collection, earnedPoints }) => ({
				slug: collection.slug,
				name: collection.badge.name,
				imageUrl: null,
				points: earnedPoints,
			})),
		// What they are after: the collections they follow and show, minus the
		// finished ones — those are badges now.
		pursuits: resolved
			.filter(({ collection, completed }) => shown.has(collection.slug) && !completed)
			.map(({ collection, owned, total }) => ({
				slug: collection.slug,
				name: collection.name,
				owned,
				total,
			})),
		// The oldest records first, which is how the window weighs them when
		// no copy claims a special edition — and past forty years the weight
		// is the same for all of them, so the year itself breaks the tie, as
		// it does in `toShowcase`.
		showcase: [...views]
			.sort(
				(one, other) =>
					ageWeight(other.year) - ageWeight(one.year) ||
					one.year - other.year ||
					one.title.localeCompare(other.title)
			)
			.slice(0, SHOWCASE_LIMIT)
			.map(({ title, artistName, year, format, coverUrl }) => ({
				title,
				artistName,
				year,
				format,
				coverUrl,
				editions: [],
			})),
		wishlist: (collector.wishes ?? []).map(({ album, medias }) => {
			const wish = albums.get(album);

			return {
				title: wish.name,
				artistName: wish.artist.name,
				coverUrl: wish.coverUrl,
				medias,
			};
		}),
	};
}

/** The directory entry behind the wall and the home page's highlights. */
function toCard(collector, profile, resolved) {
	const shown = new Set(collector.shown ?? []);

	return {
		uid: profile.uid,
		displayName: collector.displayName,
		countryCode: collector.countryCode,
		city: collector.city,
		copies: profile.numbers.copies,
		points: profile.points.total,
		badges: profile.badges,
		// The window's own order, exactly as `toPublicCollectorCard` takes
		// it, and only the records that have a sleeve: a row of four covers
		// is read at a glance, and a placeholder tile says nothing.
		records: profile.showcase
			.filter(({ coverUrl }) => !!coverUrl)
			.slice(0, CARD_RECORD_LIMIT)
			.map(({ title, artistName, coverUrl }) => ({
				title,
				artistName,
				coverUrl,
			})),
		collecting: resolved
			.filter(({ collection, completed }) => shown.has(collection.slug) && !completed)
			.map(({ collection }) => ({ slug: collection.slug, name: collection.name })),
		hasPage: true,
	};
}

/** Everything the run would write, with a line of its own per collector. */
const writes = [];
const warnings = [];

for (const genre of genres) {
	const collector = genre.collector;
	const uid = collectorUid(collector.slug);
	const userRef = db.collection(USER_COLLECTION).doc(uid);
	const owned = new Set(collector.copies.map(({ album }) => album));
	const resolved = standings(genre, owned);
	const copies = collector.copies.map((copy, index) => toCopy(collector, copy, index));
	const views = copies.map(({ view }) => view);
	const profile = toProfile(collector, views, resolved);
	const expected = collector.completed;

	if (expected && !resolved.some(({ collection, completed }) => collection.slug === expected && completed)) {
		const standing = resolved.find(({ collection }) => collection.slug === expected);

		warnings.push(
			`${collector.displayName}: "${expected}" is ${standing?.owned ?? 0}/${standing?.total ?? 0}` +
				', so no badge — add the missing copies to the seed data'
		);
	}

	writes.push(
		{
			label: `${collector.displayName} (${genre.slug})`,
			ref: userRef,
			data: {
				uid,
				entityType: 'User',
				displayName: collector.displayName,
				email: null,
				firstName: '',
				lastName: '',
				phone: '',
				photoURL: null,
				roleIds: ['USER'],
			},
		},
		{
			label: `  setting/genre-scope → ${genre.slug}`,
			ref: userRef.collection('setting').doc('genre-scope'),
			data: { genres: [genre.slug] },
		},
		{
			label: '  setting/location',
			ref: userRef.collection('setting').doc('location'),
			data: {
				level: 'profile',
				countryCode: collector.countryCode,
				city: collector.city,
			},
		},
		{
			label: '  setting/collector-profile',
			ref: userRef.collection('setting').doc('collector-profile'),
			// The ratings are not shared: nothing here rates a record, and a
			// page offering an empty list of favourites is a page with a bug.
			data: { shared: true, shareWishlist: true, shareRatings: false },
		},
		{
			label: '  setting/collection-following',
			ref: userRef.collection('setting').doc('collection-following'),
			data: {
				followed: genre.collections.map(({ slug }) => slug),
				shown: collector.shown ?? [],
			},
		},
		{
			label: `  ${USER_LOCATION_COLLECTION}/${uid}`,
			ref: db.collection(USER_LOCATION_COLLECTION).doc(uid),
			data: {
				uid,
				level: 'profile',
				countryCode: collector.countryCode,
				city: collector.city,
				displayName: collector.displayName,
			},
		}
	);

	copies.forEach(({ release, item, view }) => {
		writes.push(
			{ label: `  release ${view.title} (${view.format})`, ...release },
			{ label: `  copy    ${view.title}`, ...item }
		);
	});

	(collector.wishes ?? []).forEach(({ album, medias }) => {
		const wish = albums.get(album);

		if (!wish) {
			throw new Error(`${collector.slug}: unknown wished album "${album}"`);
		}

		const wishUid = `seed-${collector.slug}-${album}`;

		writes.push({
			label: `  wish    ${wish.name}`,
			ref: userRef.collection(WISHLIST_ITEM_COLLECTION).doc(wishUid),
			data: {
				uid: wishUid,
				entityType: 'Wishlist Item',
				active: true,
				albumReference: {
					uid: wish.uid,
					name: wish.name,
					coverImage: null,
				},
				artistReference: {
					uid: seedUid(wish.artist.slug),
					name: wish.artist.name,
				},
				medias,
				sourceLink: '',
				userReference: { uid, displayName: collector.displayName },
				searchParameters: searchParameters(wish.name),
			},
		});
	});

	writes.push(
		{
			label: `  ${COLLECTOR_COLLECTION}/${uid} — ${profile.points.total} pts, ${profile.badges.length} badge(s)`,
			ref: db.collection(COLLECTOR_COLLECTION).doc(uid),
			data: profile,
		},
		{
			label: `  ${COLLECTOR_COLLECTION}/${uid}/albums/all`,
			ref: db
				.collection(COLLECTOR_COLLECTION)
				.doc(uid)
				.collection('albums')
				.doc('all'),
			data: {
				uid,
				count: views.length,
				albums: [...views]
					.sort(
						(one, other) =>
							one.artistName.localeCompare(other.artistName) ||
							one.year - other.year
					)
					.map(({ title, artistName, year, format }) => ({
						title,
						artistName,
						year,
						format,
					})),
			},
		},
		{
			label: `  ${COLLECTOR_CARD_COLLECTION}/${uid}`,
			ref: db.collection(COLLECTOR_CARD_COLLECTION).doc(uid),
			data: toCard(collector, profile, resolved),
		}
	);
}

warnings.forEach((warning) => console.warn(`  WARNING ${warning}`));

const existing = await db.getAll(...writes.map(({ ref }) => ref));
const planned = [];

for (const [index, write] of writes.entries()) {
	if (existing[index].exists && !options.force) {
		console.log(`  skip  ${write.label}`);
		continue;
	}

	planned.push(write);
	console.log(`  ${existing[index].exists ? 'update' : 'create'}  ${write.label}`);
}

if (!planned.length) {
	console.log('nothing to write');
	process.exit(0);
}
if (!options.confirm) {
	console.log(`DRY RUN — ${planned.length} document(s); add --confirm`);
	process.exit(0);
}

const writer = db.bulkWriter();
const failures = [];

writer.onWriteError((error) => {
	if ([7, 8].includes(error.code) || error.failedAttempts >= 3) {
		failures.push(`${error.documentRef.path}: ${error.message}`);
		return false;
	}
	return true;
});

planned.forEach(({ ref, data }) => writer.set(ref, stamp(data)));
await writer.close();

await touchCatalog(db, syncedFeatures(planned.map(({ ref }) => ref)));

failures.forEach((failure) => console.error(`  FAILED ${failure}`));
console.log(`written ${planned.length - failures.length}/${planned.length}`);

/**
 * Takes the mock collectors back out: their copies, wishes, settings, the
 * public documents and the user document itself, each with a tombstone so the
 * clients drop them from their caches too.
 *
 * The generic releases they created stay: they belong to the catalog, not to
 * a collector, and the next collector of that album will want the same
 * document. `seed-genre-catalog.mjs --remove` clears those.
 */
async function remove() {
	const refs = [];

	for (const { collector } of genres) {
		const uid = collectorUid(collector.slug);
		const userRef = db.collection(USER_COLLECTION).doc(uid);

		for (const sub of ['setting', COLLECTION_ITEM_COLLECTION, WISHLIST_ITEM_COLLECTION]) {
			const documents = await userRef.collection(sub).get();

			documents.docs.forEach((document) => refs.push(document.ref));
		}

		const shelf = await db
			.collection(COLLECTOR_COLLECTION)
			.doc(uid)
			.collection('albums')
			.get();

		shelf.docs.forEach((document) => refs.push(document.ref));
		refs.push(
			db.collection(COLLECTOR_COLLECTION).doc(uid),
			db.collection(COLLECTOR_CARD_COLLECTION).doc(uid),
			db.collection(USER_LOCATION_COLLECTION).doc(uid),
			userRef
		);
	}

	console.log(`  ${refs.length} document(s) to delete`);

	if (!options.confirm) {
		console.log('DRY RUN — add --confirm');
		return;
	}

	const deleter = db.bulkWriter();

	refs.forEach((ref) => {
		deleter.delete(ref);

		// A tombstone only where the sync reads them; see
		// `SYNCED_FEATURE_KEYS`.
		if (SYNCED_FEATURE_KEYS.has(featureKeyOf(ref))) {
			const marker = tombstone(db, ref);

			deleter.set(marker.ref, marker.data);
		}
	});
	await deleter.close();
	await touchCatalog(db, syncedFeatures(refs));

	console.log(`deleted ${refs.length}`);
}
