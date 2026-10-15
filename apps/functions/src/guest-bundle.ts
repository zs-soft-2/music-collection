/**
 * A vendég-bundle: a katalógus egy kirakata annak, aki még nem választott
 * műfajt — vendégnek, és a bejelentkezett gyűjtőnek is, amíg nem szűkített.
 *
 * Műfajonként legfeljebb öt collection, a hozzájuk tartozó albumokkal és az
 * albumok előadóival. Track, közreműködés, tagság és zenész nincs benne: a
 * katalógus súlyát ezek adják (a rock bundle 39 ezer dokumentumából 30 ezer),
 * és a kliens ezeket lapnyitáskor, szűrt lekérdezéssel kéri a szervertől
 * (`narrow` a FirestoreSyncService-ben).
 *
 * A gyűjtők nincsenek benne, mert nem kell: a `collector-card` könyvtár
 * (60 kártya) nem műfaj-szeletelt, minden kliens megkapja.
 *
 * A választás a hétből származik: ugyanaz a hét ugyanazt a kirakatot adja,
 * hétfőn cserélődik. Az éjszakai futás ennél gyakrabban is építhet — akkor,
 * ha a katalógus (előadó, album, collection) változott az előző építés óta —,
 * de ugyanazzal a választással, csak frissebb tartalommal.
 *
 * A collection feloldása itt a kliens resolverének másolata
 * (`libs/domain/music/music-collection/engine`), mert a functions nem lát
 * libeket. Egy eltérés nem tör el semmit: legfeljebb egy album hiányzik a
 * kirakatból, és a kliens a saját resolverével rajzol.
 */

import { gzipSync } from 'node:zlib';

import {
	DocumentSnapshot,
	FieldValue,
	Firestore,
	Timestamp,
} from 'firebase-admin/firestore';

import { gameWeek } from './band-of-the-week';
import {
	BundleBucket,
	buildBundle,
	removeOldBundles,
	uploadBundle,
} from './bundle-storage';
import { createRandom, hashSeed, shuffle } from './daily-question';

const SYNC_COLLECTION = 'sync';
const CATALOG_SYNC_DOCUMENT = 'catalog';
const GENRE_COLLECTION = 'genre';
const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';
const MUSIC_COLLECTION_COLLECTION = 'music-collection';

/** Storage-mappa: `bundles/guest/{seconds}.bundle`. */
export const GUEST_BUNDLE_FOLDER = 'bundles/guest';

/** Műfajonként ennyi collection kerül a kirakatba. */
export const GUEST_COLLECTIONS_PER_GENRE = 5;

/** A feature-ök, amelyek változása új építést kér. */
const SOURCE_FEATURE_KEYS = [
	ARTIST_COLLECTION,
	ALBUM_COLLECTION,
	MUSIC_COLLECTION_COLLECTION,
];

// ── A feloldás ──────────────────────────────────────────────────────────────

interface NumberCriterion {
	equals?: number;
	from?: number;
	to?: number;
}

interface EnumCriterion {
	includesAny?: string[];
	includesAll?: string[];
	excludes?: string[];
}

interface ReferenceCriterion {
	includesAny?: string[];
}

export interface GuestCriteria {
	years?: NumberCriterion;
	styles?: EnumCriterion;
	artistStyles?: EnumCriterion;
	albumFormats?: EnumCriterion;
	artists?: ReferenceCriterion;
	artistCountries?: EnumCriterion;
	credits?: unknown;
}

export interface GuestAlbum {
	uid: string;
	artistUid: string;
	year: number | null;
	styles: string[];
	format: string | null;
	/** A taxonómia slugja: az album műfaja, vagy az előadóé, ha neki nincs. */
	genre: string | null;
}

export interface GuestArtist {
	uid: string;
	styles: string[];
	country: string | null;
}

export interface GuestCollection {
	uid: string;
	slug: string;
	status: string;
	parentUid: string | null;
	group: string | null;
	criteria: GuestCriteria;
}

/** Az év, akárhogy van tárolva — mint a kliens `toYear`-je. */
export function toYear(value: unknown): number | null {
	let ms: number | null = null;

	if (typeof value === 'number') {
		ms = value;
	} else if (typeof value === 'string' && value) {
		const parsed = Date.parse(value);

		ms = isNaN(parsed) ? null : parsed;
	} else if (value instanceof Date) {
		ms = isNaN(value.getTime()) ? null : value.getTime();
	} else if (value && typeof value === 'object' && 'seconds' in value) {
		const seconds = (value as { seconds: unknown }).seconds;

		ms = typeof seconds === 'number' ? seconds * 1000 : null;
	}

	return ms === null ? null : new Date(ms).getFullYear();
}

function matchesNumber(
	value: number | null,
	criterion?: NumberCriterion
): boolean {
	if (!criterion) {
		return true;
	}
	if (value === null) {
		return false;
	}

	return (
		(criterion.equals === undefined || value === criterion.equals) &&
		(criterion.from === undefined || value >= criterion.from) &&
		(criterion.to === undefined || value <= criterion.to)
	);
}

function matchesEnum(values: string[], criterion?: EnumCriterion): boolean {
	return (
		!criterion ||
		((criterion.includesAny === undefined ||
			criterion.includesAny.some((wanted) => values.includes(wanted))) &&
			(criterion.includesAll === undefined ||
				criterion.includesAll.every((wanted) =>
					values.includes(wanted)
				)) &&
			(criterion.excludes === undefined ||
				!criterion.excludes.some((unwanted) =>
					values.includes(unwanted)
				)))
	);
}

const asList = (value: string | null): string[] =>
	value === null ? [] : [value];

/** Illeszkedik-e az album a szabályra — a kliens `matchesAlbum`-ja, credits nélkül. */
export function matchesAlbum(
	album: GuestAlbum,
	criteria: GuestCriteria,
	artists: Map<string, GuestArtist>
): boolean {
	if (
		!matchesNumber(album.year, criteria.years) ||
		!matchesEnum(album.styles, criteria.styles) ||
		!matchesEnum(asList(album.format), criteria.albumFormats) ||
		!(
			criteria.artists?.includesAny === undefined ||
			criteria.artists.includesAny.includes(album.artistUid)
		)
	) {
		return false;
	}

	if (criteria.artistStyles || criteria.artistCountries) {
		const artist = artists.get(album.artistUid);

		return (
			!!artist &&
			matchesEnum(artist.styles, criteria.artistStyles) &&
			matchesEnum(asList(artist.country), criteria.artistCountries)
		);
	}

	return true;
}

/**
 * A collection műfaja: amelyikbe az albumainak többsége tartozik. Döntetlennél
 * a slug ábécéje dönt, hogy a választás futásról futásra ugyanaz legyen.
 */
export function collectionGenre(albums: GuestAlbum[]): string | null {
	const counts = new Map<string, number>();

	for (const album of albums) {
		if (album.genre) {
			counts.set(album.genre, (counts.get(album.genre) ?? 0) + 1);
		}
	}

	return (
		[...counts].sort(
			([slug, count], [otherSlug, otherCount]) =>
				otherCount - count || slug.localeCompare(otherSlug)
		)[0]?.[0] ?? null
	);
}

export interface ShowcaseEntry {
	collection: GuestCollection;
	albums: GuestAlbum[];
	genre: string;
}

/**
 * Műfajonként a hét öt collectionje.
 *
 * Csak publikált, önálló (nem „Beyond the Albums" kísérő) collection jöhet,
 * amelyik legalább egy albumra illeszkedik. A credits-szabályúak kimaradnak:
 * azokat a kliens csak a közreműködésekből tudná feloldani, azok pedig nincsenek
 * a bundle-ben — a kirakatban 0/0-val állnának.
 *
 * A sorrend a hét és a műfaj véletlene, de a stílus- és szcéna-collectionök
 * előbb jönnek, mint a diszkográfiák: a kirakat a műfaj szélességét mutassa,
 * ne öt zenekar életművét.
 */
export function pickShowcase(
	collections: GuestCollection[],
	albums: GuestAlbum[],
	artists: Map<string, GuestArtist>,
	week: string,
	perGenre: number = GUEST_COLLECTIONS_PER_GENRE
): Map<string, ShowcaseEntry[]> {
	const byGenre = new Map<string, ShowcaseEntry[]>();

	for (const collection of collections) {
		if (
			collection.status !== 'published' ||
			collection.parentUid ||
			collection.criteria.credits
		) {
			continue;
		}

		const matched = albums.filter((album) =>
			matchesAlbum(album, collection.criteria, artists)
		);
		const genre = collectionGenre(matched);

		if (!genre) {
			continue;
		}

		const entries = byGenre.get(genre) ?? [];

		entries.push({ collection, albums: matched, genre });
		byGenre.set(genre, entries);
	}

	const showcase = new Map<string, ShowcaseEntry[]>();

	for (const [genre, entries] of [...byGenre].sort(([a], [b]) =>
		a.localeCompare(b)
	)) {
		// Uid szerint rendezve keverünk: a Firestore olvasási sorrendje nem
		// lehet a véletlen része.
		const ordered = [...entries].sort((a, b) =>
			a.collection.uid.localeCompare(b.collection.uid)
		);
		const random = createRandom(hashSeed(`${week}:${genre}`));
		const picked = shuffle(ordered, random)
			.sort(
				(a, b) =>
					Number(a.collection.group === 'discography') -
					Number(b.collection.group === 'discography')
			)
			.slice(0, perGenre);

		showcase.set(genre, picked);
	}

	return showcase;
}

// ── Az építés ───────────────────────────────────────────────────────────────

/** A `sync/catalog.guestBundle` bejegyzés, amiből a kliens tudja, mit töltsön. */
export interface GuestBundleEntry {
	path: string;
	/** A pillanatkép ideje — ez azonosítja a bundle-t a kliens könyvelésében. */
	modifiedAt: Timestamp;
	count: number;
	/**
	 * Feature-önként a dokumentumok száma. A kliens ebből tudja, hogy a
	 * tracket nem a bundle-ből kell várnia — nem tölti le érte újra.
	 */
	features: Record<string, number>;
	/** A hét, amelyiknek a választása ez. */
	week: string;
	/** Műfajonként a kirakat collectionjeinek uid-ja. */
	collections: Record<string, string[]>;
	/** A forrás-feature-ök legújabb verziója az építéskor. */
	catalogAt: Timestamp | null;
}

export interface GuestBundleResult {
	week: string;
	built: boolean;
	reason: 'built' | 'current' | 'no-catalog';
	path: string | null;
	count: number;
	collections: number;
	bytes: number;
}

const newestOf = (times: (Timestamp | null | undefined)[]): Timestamp | null =>
	times.reduce<Timestamp | null>(
		(newest, time) =>
			time && (!newest || time.toMillis() > newest.toMillis())
				? time
				: newest,
		null
	);

/**
 * Kell-e új építés: más hét van, vagy a katalógus változott az előző óta.
 * Egy ugyanazon a héten megismételt futás így semmit nem ír.
 */
export function needsBuild(
	existing: Partial<GuestBundleEntry> | null,
	week: string,
	catalogAt: Timestamp | null
): boolean {
	return (
		!existing?.path ||
		existing.week !== week ||
		(!!catalogAt &&
			(!existing.catalogAt ||
				catalogAt.toMillis() > existing.catalogAt.toMillis()))
	);
}

const toStrings = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];

const toText = (value: unknown): string | null =>
	typeof value === 'string' && value ? value : null;

/**
 * Megépíti és kiteszi a hét vendég-bundle-jét, ha kell.
 *
 * Futásonként egy olvasás a `sync/catalog`-ra, és ha építeni kell, az összes
 * előadó, album, collection és a taxonómia — néhány ezer dokumentum, hetente
 * egyszer, plusz amikor a katalógus változik.
 */
export async function composeGuestBundle(
	database: Firestore,
	bucket: BundleBucket,
	options: { today?: Date; force?: boolean } = {}
): Promise<GuestBundleResult> {
	const week = gameWeek(options.today ?? new Date());
	const catalogReference = database
		.collection(SYNC_COLLECTION)
		.doc(CATALOG_SYNC_DOCUMENT);
	const catalog = await catalogReference.get();
	const catalogAt = newestOf(
		SOURCE_FEATURE_KEYS.map(
			(key) => catalog.get(`modifiedAt.${key}`) as Timestamp | undefined
		)
	);
	const existing =
		(catalog.get('guestBundle') as Partial<GuestBundleEntry>) ?? null;
	const skipped = (reason: GuestBundleResult['reason']) => ({
		week,
		built: false,
		reason,
		path: existing?.path ?? null,
		count: existing?.count ?? 0,
		collections: Object.values(existing?.collections ?? {}).flat().length,
		bytes: 0,
	});

	if (!options.force && !needsBuild(existing, week, catalogAt)) {
		return skipped('current');
	}

	const [taxonomy, artistSnapshot, albumSnapshot, collectionSnapshot] =
		await Promise.all([
			database.collection(GENRE_COLLECTION).get(),
			database.collectionGroup(ARTIST_COLLECTION).get(),
			database.collectionGroup(ALBUM_COLLECTION).get(),
			database.collection(MUSIC_COLLECTION_COLLECTION).get(),
		]);

	const genreOf = new Map(
		taxonomy.docs.map((document) => [document.get('name'), document.id])
	);
	const artistDocuments = new Map<string, DocumentSnapshot>();
	const artists = new Map<string, GuestArtist>();
	const artistGenre = new Map<string, string | null>();

	for (const document of artistSnapshot.docs) {
		artistDocuments.set(document.id, document);
		artists.set(document.id, {
			uid: document.id,
			styles: toStrings(document.get('styles')),
			country: toText(document.get('country')),
		});
		artistGenre.set(
			document.id,
			genreOf.get(document.get('genre')) ?? null
		);
	}

	const albumDocuments = new Map<string, DocumentSnapshot>();
	const albums: GuestAlbum[] = albumSnapshot.docs.map((document) => {
		const artistUid =
			toText(document.get('artist.uid')) ??
			document.ref.parent.parent?.id ??
			'';

		albumDocuments.set(document.id, document);

		return {
			uid: document.id,
			artistUid,
			year: toYear(document.get('year')),
			styles: toStrings(document.get('styles')),
			format: toText(document.get('format')),
			genre:
				genreOf.get(document.get('genre')) ??
				artistGenre.get(artistUid) ??
				null,
		};
	});
	const collections: GuestCollection[] = collectionSnapshot.docs.map(
		(document) => ({
			uid: document.id,
			slug: toText(document.get('slug')) ?? document.id,
			status: toText(document.get('status')) ?? 'draft',
			parentUid: toText(document.get('parentUid')),
			group: toText(document.get('group')),
			criteria: (document.get('criteria') as GuestCriteria) ?? {},
		})
	);

	const showcase = pickShowcase(collections, albums, artists, week);
	const entries = [...showcase.values()].flat();

	if (!entries.length) {
		return skipped('no-catalog');
	}

	const albumUids = new Set(
		entries.flatMap((entry) => entry.albums.map((album) => album.uid))
	);
	const artistUids = new Set(
		entries.flatMap((entry) => entry.albums.map((album) => album.artistUid))
	);
	const pickedAlbums = [...albumUids]
		.map((uid) => albumDocuments.get(uid))
		.filter((document): document is DocumentSnapshot => !!document);
	const pickedArtists = [...artistUids]
		.map((uid) => artistDocuments.get(uid))
		.filter((document): document is DocumentSnapshot => !!document);

	const modifiedAt = Timestamp.now();
	const builder = database.bundle(`guest-${week}-${modifiedAt.seconds}`);

	for (const document of [...pickedArtists, ...pickedAlbums]) {
		builder.add(document);
	}

	const gzipped = gzipSync(buildBundle(builder));
	const path = `${GUEST_BUNDLE_FOLDER}/${modifiedAt.seconds}.bundle`;

	await uploadBundle(bucket, path, gzipped);

	const count = pickedArtists.length + pickedAlbums.length;
	const entry: GuestBundleEntry = {
		path,
		modifiedAt,
		count,
		features: {
			[ARTIST_COLLECTION]: pickedArtists.length,
			[ALBUM_COLLECTION]: pickedAlbums.length,
		},
		week,
		collections: Object.fromEntries(
			[...showcase].map(([genre, picked]) => [
				genre,
				picked.map((item) => item.collection.uid),
			])
		),
		catalogAt,
	};

	await catalogReference.set(
		{ guestBundle: { ...entry, builtAt: FieldValue.serverTimestamp() } },
		{ merge: true }
	);
	await removeOldBundles(bucket, GUEST_BUNDLE_FOLDER, path);

	return {
		week,
		built: true,
		reason: 'built',
		path,
		count,
		collections: entries.length,
		bytes: gzipped.length,
	};
}
