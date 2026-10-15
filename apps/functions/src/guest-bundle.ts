/**
 * A vendég-bundle: a katalógus egy kirakata annak, aki még nem választott
 * műfajt — vendégnek, és a bejelentkezett gyűjtőnek is, amíg nem szűkített.
 *
 * Műfajonként legfeljebb öt collection, a hozzájuk tartozó albumokkal és az
 * albumok előadóival — és **zártan**: ami a kirakatból egy kattintással
 * elérhető, az is benne van. Az albumok trackjei és közreműködései, az
 * előadók tagságai, és minden zenész, akit ezek megneveznek. A vendég így
 * lapnyitáskor semmit nem kérdez a szervertől; ami a bundle-ön kívül esik
 * (egy kirakatbeli előadó többi lemeze, egy zenész másik zenekara), az nála
 * nem jelenik meg, nem üres lapra vezet.
 *
 * A határ szándékos: a teljes burok (zenészen át a többi zenekarba) a dev
 * katalógus 90%-a volt, a zárt kirakat ~700 KB a teljes ~2,6 MB-ból.
 *
 * A gyűjtők nincsenek benne, mert nem kell: a `collector-card` könyvtár
 * (60 kártya) nem műfaj-szeletelt, minden kliens megkapja. A kártyák viszont
 * collectionöket neveznek meg (jelvény, vadászat), és a nyitólapról egy
 * kattintás odavisz — ezért a kártyákon szereplő collectionök a sorsolástól
 * függetlenül bekerülnek. Ami a nyitólapon kint van, az a vendégnek nyíljon
 * is ki, ne 0/0-val álljon.
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
const COLLECTOR_CARD_COLLECTION = 'collector-card';
const TRACK_COLLECTION = 'track';
const CONTRIBUTION_COLLECTION = 'contribution';
const MEMBERSHIP_COLLECTION = 'membership';
const MUSICIAN_COLLECTION = 'musician';

/** A feature-ök, amelyek változása új építést kér: mind, ami a bundle-be kerül. */
const SOURCE_FEATURE_KEYS = [
	ARTIST_COLLECTION,
	ALBUM_COLLECTION,
	MUSIC_COLLECTION_COLLECTION,
	TRACK_COLLECTION,
	CONTRIBUTION_COLLECTION,
	MEMBERSHIP_COLLECTION,
	MUSICIAN_COLLECTION,
];

/** Az `in` szűrő felső határa egy lekérdezésben. */
const IN_LIMIT = 30;
/** Egy `getAll` ennyi dokumentumot kér egyszerre. */
const GET_ALL_LIMIT = 100;

/** Storage-mappa: `bundles/guest/{seconds}.bundle`. */
export const GUEST_BUNDLE_FOLDER = 'bundles/guest';

/** Műfajonként ennyi collection kerül a kirakatba. */
export const GUEST_COLLECTIONS_PER_GENRE = 5;

const toStrings = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];

const toText = (value: unknown): string | null =>
	typeof value === 'string' && value ? value : null;

const asArray = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : [];

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

/**
 * A collection-slugok, amelyeket a gyűjtő-kártyák megneveznek: a megszerzett
 * jelvények és a kiírt vadászatok. A régi kártya a vadászatot puszta slugként
 * hordja, az újabb `{slug, name}`-ként. Rendezve, hogy két futás összevethető
 * legyen.
 */
export function cardSlugs(cards: Record<string, unknown>[]): string[] {
	const slugs = new Set<string>();
	const slugOf = (value: unknown): string | null =>
		typeof value === 'string'
			? toText(value)
			: value && typeof value === 'object'
				? toText((value as Record<string, unknown>)['slug'])
				: null;

	for (const card of cards) {
		for (const value of [
			...asArray(card['badges']),
			...asArray(card['collecting']),
		]) {
			const slug = slugOf(value);

			if (slug) {
				slugs.add(slug);
			}
		}
	}

	return [...slugs].sort();
}

/**
 * A kártyákon megnevezett collectionök, amelyeket a sorsolás nem húzott ki.
 *
 * A kísérő collection is jöhet — azt a kártya nevezte meg, nem a kirakat
 * szélessége kéri. A draft és a credits-szabályú nem: az elsőt a kliens nem
 * mutatja, a másodikat a közreműködések nélkül nem tudná feloldani.
 */
export function pickFeatured(
	collections: GuestCollection[],
	albums: GuestAlbum[],
	artists: Map<string, GuestArtist>,
	slugs: string[],
	picked: Set<string>
): ShowcaseEntry[] {
	const wanted = new Set(slugs);

	return collections
		.filter(
			(collection) =>
				wanted.has(collection.slug) &&
				!picked.has(collection.uid) &&
				collection.status === 'published' &&
				!collection.criteria.credits
		)
		.map((collection) => {
			const matched = albums.filter((album) =>
				matchesAlbum(album, collection.criteria, artists)
			);

			return {
				collection,
				albums: matched,
				genre: collectionGenre(matched) ?? '',
			};
		})
		.filter((entry) => entry.albums.length > 0);
}

// ── Az építés ───────────────────────────────────────────────────────────────

const chunks = <T>(items: T[], size: number): T[][] =>
	Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
		items.slice(index * size, (index + 1) * size)
	);

/** A kollekció dokumentumai, amelyeknek a mezője a felsoroltak egyike. */
async function readWhereIn(
	database: Firestore,
	collection: string,
	field: string,
	values: string[]
): Promise<DocumentSnapshot[]> {
	const snapshots = await Promise.all(
		chunks(values, IN_LIMIT).map((chunk) =>
			database.collection(collection).where(field, 'in', chunk).get()
		)
	);

	return snapshots.flatMap((snapshot) => snapshot.docs);
}

/** A kollekció dokumentumai azonosító szerint; a nem létezőek kimaradnak. */
async function readByIds(
	database: Firestore,
	collection: string,
	uids: string[]
): Promise<DocumentSnapshot[]> {
	const snapshots = await Promise.all(
		chunks(uids, GET_ALL_LIMIT).map((chunk) =>
			database.getAll(
				...chunk.map((uid) => database.collection(collection).doc(uid))
			)
		)
	);

	return snapshots.flat().filter((document) => document.exists);
}

/**
 * Ami egy kirakatbeli album és előadó lapjáról elérhető: a trackek, a
 * közreműködések, a tagságok, és a zenészek, akiket ezek megneveznek. Itt
 * áll meg — egy zenész többi zenekara már nem jön, különben a burok a
 * katalógus nagy része lenne.
 */
export async function readSurroundings(
	database: Firestore,
	albumUids: string[],
	artistUids: string[]
): Promise<{
	tracks: DocumentSnapshot[];
	contributions: DocumentSnapshot[];
	memberships: DocumentSnapshot[];
	musicians: DocumentSnapshot[];
}> {
	const [tracks, contributions, memberships] = await Promise.all([
		readWhereIn(database, TRACK_COLLECTION, 'albumUid', albumUids),
		readWhereIn(database, CONTRIBUTION_COLLECTION, 'albumUid', albumUids),
		readWhereIn(database, MEMBERSHIP_COLLECTION, 'artistUid', artistUids),
	]);
	const musicianUids = new Set(
		[...contributions, ...memberships]
			.map((document) => toText(document.get('musicianUid')))
			.filter((uid): uid is string => !!uid)
	);
	const musicians = await readByIds(database, MUSICIAN_COLLECTION, [
		...musicianUids,
	]);

	return { tracks, contributions, memberships, musicians };
}

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
	/**
	 * A gyűjtő-kártyák által megnevezett collectionök slugjai az építéskor —
	 * ha a kártyák mást neveznek meg, új építés kell.
	 */
	cardSlugs: string[];
	/** Ezekből a sorsolás mellé felvett collectionök uid-ja. */
	featured: string[];
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
 * Kell-e új építés: más hét van, a katalógus változott az előző óta, vagy a
 * gyűjtő-kártyák más collectionöket neveznek meg. Egy ugyanazon a héten
 * megismételt futás így semmit nem ír.
 */
export function needsBuild(
	existing: Partial<GuestBundleEntry> | null,
	week: string,
	catalogAt: Timestamp | null,
	slugs: string[] = []
): boolean {
	return (
		!existing?.path ||
		existing.week !== week ||
		(!!catalogAt &&
			(!existing.catalogAt ||
				catalogAt.toMillis() > existing.catalogAt.toMillis())) ||
		(existing.cardSlugs ?? []).join('\n') !== slugs.join('\n')
	);
}

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

	// Pár tucat kis doksi naponta: ennyiből derül ki, hogy a kártyák új
	// collectiont neveztek-e meg.
	const cards = await database.collection(COLLECTOR_CARD_COLLECTION).get();
	const slugs = cardSlugs(cards.docs.map((document) => document.data()));

	if (!options.force && !needsBuild(existing, week, catalogAt, slugs)) {
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
	const drawn = [...showcase.values()].flat();
	const featured = pickFeatured(
		collections,
		albums,
		artists,
		slugs,
		new Set(drawn.map((entry) => entry.collection.uid))
	);
	const entries = [...drawn, ...featured];

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

	const surroundings = await readSurroundings(
		database,
		pickedAlbums.map((document) => document.id),
		pickedArtists.map((document) => document.id)
	);
	const included = [
		...pickedArtists,
		...pickedAlbums,
		...surroundings.tracks,
		...surroundings.contributions,
		...surroundings.memberships,
		...surroundings.musicians,
	];

	const modifiedAt = Timestamp.now();
	const builder = database.bundle(`guest-${week}-${modifiedAt.seconds}`);

	for (const document of included) {
		builder.add(document);
	}

	const gzipped = gzipSync(buildBundle(builder));
	const path = `${GUEST_BUNDLE_FOLDER}/${modifiedAt.seconds}.bundle`;

	await uploadBundle(bucket, path, gzipped);

	const count = included.length;
	const entry: GuestBundleEntry = {
		path,
		modifiedAt,
		count,
		// Minden feature szerepel, a nullás is: a kliens ebből tudja, hogy a
		// bundle zárt, és a hiányzó dokumentumot nem kell a szervertől kérnie.
		features: {
			[ARTIST_COLLECTION]: pickedArtists.length,
			[ALBUM_COLLECTION]: pickedAlbums.length,
			[TRACK_COLLECTION]: surroundings.tracks.length,
			[CONTRIBUTION_COLLECTION]: surroundings.contributions.length,
			[MEMBERSHIP_COLLECTION]: surroundings.memberships.length,
			[MUSICIAN_COLLECTION]: surroundings.musicians.length,
		},
		week,
		collections: Object.fromEntries(
			[...showcase].map(([genre, picked]) => [
				genre,
				picked.map((item) => item.collection.uid),
			])
		),
		cardSlugs: slugs,
		featured: featured.map((item) => item.collection.uid),
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
