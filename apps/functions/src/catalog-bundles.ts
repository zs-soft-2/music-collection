/**
 * A katalógus-bundle-ök állapota és kézi újraépítése az admin felületről.
 *
 * Háromféle bundle él a `sync/catalog` dokumentumban:
 * - feature-bundle (`bundles.{featureKey}`): egy feature minden dokumentuma —
 *   ezt kapja az admin és az, akinek még nincs kirakata;
 * - műfaj-bundle (`genreBundles.{slug}`): egy műfaj szelete hat feature-ből;
 * - vendég-bundle (`guestBundle`): a heti kirakat (`guest-bundle.ts`).
 *
 * Az építés ugyanaz, mint a tools/sync/build-bundles.mjs és
 * build-genre-bundles.mjs scripteké — a functions nem lát a tools alá, ezért
 * itt másolatban él. A kettő ugyanazt az alakot írja a `sync/catalog`-ba,
 * tehát bármelyikkel épített bundle-t a másik felülírhat.
 *
 * Az állapot azt mondja meg, érdemes-e építeni: hány dokumentum változott és
 * hány törlődött a bundle építése óta. Ezeket a hideg kliensek egyenként
 * olvassák a bundle után, tehát egy nagy szám valódi költség minden új
 * látogatónál. A számolás aggregáció (ezer találatonként egy olvasás), nem a
 * dokumentumok letöltése.
 */

import { gzipSync } from 'node:zlib';

import {
	DocumentSnapshot,
	FieldValue,
	Firestore,
	Timestamp,
} from 'firebase-admin/firestore';

import {
	BundleBucket,
	buildBundle,
	removeOldBundles,
	uploadBundle,
} from './bundle-storage';
import { composeGuestBundle } from './guest-bundle';

const SYNC_COLLECTION = 'sync';
const CATALOG_SYNC_DOCUMENT = 'catalog';
const DELETION_COLLECTION = 'deletion';
const UPDATED_AT_FIELD = 'updatedAt';
const GENRE_COLLECTION = 'genre';

/** A feature-bundle-ként publikált gyűjtemények (tools: BUNDLE_FEATURE_KEYS). */
export const BUNDLE_FEATURE_KEYS = [
	'album',
	'artist',
	'contribution',
	'membership',
	'music-collection',
	'track',
];

/** Egy műfaj-bundle feature-jei (tools: GENRE_BUNDLE_FEATURE_KEYS). */
export const GENRE_BUNDLE_FEATURE_KEYS = [
	'artist',
	'album',
	'musician',
	'track',
	'membership',
	'contribution',
];

/** A vendég-bundle forrásai: ezek változása avíthatja el. */
const GUEST_SOURCE_KEYS = ['artist', 'album', 'music-collection'];

const BUNDLE_FOLDER = 'bundles';
const GENRE_BUNDLE_FOLDER = 'bundles/genre';

/**
 * A beágyazott gyűjtemények (`artist/{uid}/album`): ezeket collection
 * groupként kell kérdezni, és az `updatedAt`-re csak nekik van
 * COLLECTION_GROUP indexe — a gyökér-gyűjteményeket a sima gyűjtemény-
 * lekérdezés éri el.
 */
const NESTED_FEATURE_KEYS = new Set(['album']);

export type CatalogBundleKind = 'feature' | 'genre' | 'guest';

/** Egy bundle sora az admin lapon. */
export interface CatalogBundleStatus {
	kind: CatalogBundleKind;
	/** A feature kulcsa, a műfaj slugja, vagy `guest`. */
	key: string;
	/** A műfaj neve a taxonómiából; más fajtánál null. */
	name: string | null;
	/** Null, ha még nincs publikálva. */
	path: string | null;
	/** Hány dokumentum van a bundle-ben. */
	count: number;
	/** Mikor épült, epoch ms. */
	builtAt: number | null;
	/** A bundle verziója, epoch ms: ennél újabb írás a változás. */
	modifiedAt: number | null;
	/** Azóta írt dokumentumok a bundle feature-jeiben. */
	changed: number;
	/** Azóta törölt dokumentumok (sírkövek). */
	deleted: number;
	/**
	 * A bundle egy reset előtt épült: a kliensek eldobják, és a feature-t
	 * dokumentumonként töltik le, amíg újra nem épül.
	 */
	outdatedByReset: boolean;
	/** Nagyjából ennyi dokumentum-olvasásba kerül az újraépítés. */
	readCost: number;
	/** A vendég-bundle hete; más fajtánál null. */
	week: string | null;
}

export interface CatalogBundleRebuildResult {
	kind: CatalogBundleKind;
	key: string;
	path: string | null;
	count: number;
	/** A gzipelt fájl mérete. */
	bytes: number;
	/** A vendég-bundle-nél: hány collection került a kirakatba. */
	collections: number | null;
}

/** Hiba, amit a callable az adminnak szövegként ad tovább. */
export class CatalogBundleError extends Error {
	public constructor(
		public readonly code: 'invalid-argument' | 'failed-precondition',
		message: string
	) {
		super(message);
	}
}

type TimestampMap = Record<string, Timestamp | undefined>;

interface BundleEntry {
	path?: string;
	modifiedAt?: Timestamp;
	count?: number;
	builtAt?: Timestamp;
	week?: string;
	catalogAt?: Timestamp | null;
}

const toMillis = (time: Timestamp | null | undefined): number | null =>
	time ? time.toMillis() : null;

/** A legújabb a megadott időpontok közül. */
export function newestOf(
	times: (Timestamp | null | undefined)[]
): Timestamp | null {
	return times.reduce<Timestamp | null>(
		(newest, time) =>
			time && (!newest || time.toMillis() > newest.toMillis())
				? time
				: newest,
		null
	);
}

/**
 * Elavult-e a bundle egy reset miatt: valamelyik feature-jét a bundle
 * építése után resetelték. A kliens ilyenkor nem bízik benne
 * (`catchUpWithBundle`), mert a reset épp azt jelenti, hogy dokumentumok
 * `updatedAt` nélkül változtak.
 */
export function isOutdatedByReset(
	resetAt: TimestampMap,
	featureKeys: string[],
	modifiedAt: Timestamp | null | undefined
): boolean {
	return (
		!!modifiedAt &&
		featureKeys.some(
			(key) =>
				!!resetAt[key] &&
				resetAt[key].toMillis() > modifiedAt.toMillis()
		)
	);
}

/**
 * Számlálók egy hívás idejére: a műfaj-bundle-ök egy futásban épülnek,
 * ugyanazzal a verzióval, tehát a tizenöt műfaj ugyanazt a hat számlálást
 * kérné — egyszer kérjük.
 */
class ChangeCounter {
	private readonly cache = new Map<string, Promise<number>>();

	public constructor(private readonly database: Firestore) {}

	/** Hány dokumentuma van a feature-nek összesen. */
	public total(featureKey: string): Promise<number> {
		return this.memo(`total:${featureKey}`, async () => {
			const snapshot = await this.scope(featureKey).count().get();

			return snapshot.data().count;
		});
	}

	public async changes(
		featureKeys: string[],
		since: Timestamp
	): Promise<{ changed: number; deleted: number }> {
		const counts = await Promise.all(
			featureKeys.map((key) =>
				Promise.all([
					this.changed(key, since),
					this.deleted(key, since),
				])
			)
		);

		return counts.reduce(
			(sum, [changed, deleted]) => ({
				changed: sum.changed + changed,
				deleted: sum.deleted + deleted,
			}),
			{ changed: 0, deleted: 0 }
		);
	}

	private changed(featureKey: string, since: Timestamp): Promise<number> {
		return this.memo(
			`changed:${featureKey}@${since.toMillis()}`,
			async () => {
				const snapshot = await this.scope(featureKey)
					.where(UPDATED_AT_FIELD, '>', since)
					.count()
					.get();

				return snapshot.data().count;
			}
		);
	}

	private deleted(featureKey: string, since: Timestamp): Promise<number> {
		return this.memo(
			`deleted:${featureKey}@${since.toMillis()}`,
			async () => {
				const snapshot = await this.database
					.collection(SYNC_COLLECTION)
					.doc(featureKey)
					.collection(DELETION_COLLECTION)
					.where('deletedAt', '>', since)
					.count()
					.get();

				return snapshot.data().count;
			}
		);
	}

	private scope(featureKey: string) {
		return NESTED_FEATURE_KEYS.has(featureKey)
			? this.database.collectionGroup(featureKey)
			: this.database.collection(featureKey);
	}

	private memo(key: string, count: () => Promise<number>): Promise<number> {
		let pending = this.cache.get(key);

		if (!pending) {
			pending = count();
			this.cache.set(key, pending);
		}

		return pending;
	}
}

/**
 * Minden bundle állapota: a kirakat, a taxonómia minden műfaja (a még
 * publikálatlanok is, hogy egy friss műfajnak is lehessen először építeni),
 * végül a feature-bundle-ök.
 */
export async function catalogBundleStatus(
	database: Firestore
): Promise<CatalogBundleStatus[]> {
	const [catalog, taxonomy] = await Promise.all([
		database.collection(SYNC_COLLECTION).doc(CATALOG_SYNC_DOCUMENT).get(),
		database.collection(GENRE_COLLECTION).get(),
	]);
	const resetAt = (catalog.get('resetAt') as TimestampMap) ?? {};
	const counter = new ChangeCounter(database);
	const totalOf = async (keys: string[]) =>
		(await Promise.all(keys.map((key) => counter.total(key)))).reduce(
			(sum, count) => sum + count,
			0
		);

	const row = async (
		kind: CatalogBundleKind,
		key: string,
		name: string | null,
		entry: BundleEntry | undefined,
		featureKeys: string[],
		since: Timestamp | null | undefined
	): Promise<CatalogBundleStatus> => {
		const [changes, readCost] = await Promise.all([
			since
				? counter.changes(featureKeys, since)
				: Promise.resolve({ changed: 0, deleted: 0 }),
			totalOf(featureKeys),
		]);

		return {
			kind,
			key,
			name,
			path: entry?.path ?? null,
			count: entry?.count ?? 0,
			builtAt: toMillis(entry?.builtAt),
			modifiedAt: toMillis(entry?.modifiedAt),
			...changes,
			outdatedByReset:
				kind !== 'guest' &&
				isOutdatedByReset(resetAt, featureKeys, entry?.modifiedAt),
			readCost,
			week: entry?.week ?? null,
		};
	};

	const guest = catalog.get('guestBundle') as BundleEntry | undefined;
	const genres = (catalog.get('genreBundles') ?? {}) as Record<
		string,
		BundleEntry | undefined
	>;
	const features = (catalog.get('bundles') ?? {}) as Record<
		string,
		BundleEntry | undefined
	>;
	const genreNames = new Map(
		taxonomy.docs.map((document) => [
			document.id,
			(document.get('name') as string) ?? document.id,
		])
	);
	const slugs = [...new Set([...genreNames.keys(), ...Object.keys(genres)])];

	return Promise.all([
		row(
			'guest',
			'guest',
			null,
			guest,
			GUEST_SOURCE_KEYS,
			guest?.catalogAt ?? guest?.modifiedAt
		),
		...slugs
			.sort((a, b) =>
				(genreNames.get(a) ?? a).localeCompare(genreNames.get(b) ?? b)
			)
			.map((slug) =>
				row(
					'genre',
					slug,
					genreNames.get(slug) ?? slug,
					genres[slug],
					GENRE_BUNDLE_FEATURE_KEYS,
					genres[slug]?.modifiedAt
				)
			),
		...BUNDLE_FEATURE_KEYS.map((key) =>
			row(
				'feature',
				key,
				null,
				features[key],
				[key],
				features[key]?.modifiedAt
			)
		),
	]);
}

/** Egy bundle újraépítése és kitétele. */
export async function rebuildCatalogBundle(
	database: Firestore,
	bucket: BundleBucket,
	kind: CatalogBundleKind,
	key: string
): Promise<CatalogBundleRebuildResult> {
	switch (kind) {
		case 'guest': {
			const result = await composeGuestBundle(database, bucket, {
				force: true,
			});

			if (!result.built) {
				throw new CatalogBundleError(
					'failed-precondition',
					'Nincs publikált collection, amiből a kirakat épülhetne.'
				);
			}

			return {
				kind,
				key: 'guest',
				path: result.path,
				count: result.count,
				bytes: result.bytes,
				collections: result.collections,
			};
		}
		case 'feature':
			return rebuildFeatureBundle(database, bucket, key);
		case 'genre':
			return rebuildGenreBundle(database, bucket, key);
		default:
			throw new CatalogBundleError(
				'invalid-argument',
				`Ismeretlen bundle-fajta: ${String(kind)}`
			);
	}
}

const catalogReference = (database: Firestore) =>
	database.collection(SYNC_COLLECTION).doc(CATALOG_SYNC_DOCUMENT);

async function rebuildFeatureBundle(
	database: Firestore,
	bucket: BundleBucket,
	featureKey: string
): Promise<CatalogBundleRebuildResult> {
	if (!BUNDLE_FEATURE_KEYS.includes(featureKey)) {
		throw new CatalogBundleError(
			'invalid-argument',
			`Nem bundle-ként publikált feature: ${featureKey}`
		);
	}

	const catalog = await catalogReference(database).get();
	const modifiedAt = catalog.get(`modifiedAt.${featureKey}`) as
		Timestamp | undefined;

	if (!modifiedAt) {
		throw new CatalogBundleError(
			'failed-precondition',
			`A(z) ${featureKey} feature-nek nincs verziója a sync/catalog-ban.`
		);
	}

	// A verzió után olvasunk: ami közben íródik, az bekerül a bundle-be, és
	// változásként még egyszer lejön — nem vész el.
	const snapshot = await database.collectionGroup(featureKey).get();
	const gzipped = gzipSync(
		buildBundle(
			database
				.bundle(`${featureKey}-${modifiedAt.seconds}`)
				.add(featureKey, snapshot)
		)
	);
	const path = `${BUNDLE_FOLDER}/${featureKey}/${modifiedAt.seconds}.bundle`;

	await uploadBundle(bucket, path, gzipped);
	await catalogReference(database).set(
		{
			bundles: {
				[featureKey]: {
					path,
					modifiedAt,
					count: snapshot.size,
					builtAt: FieldValue.serverTimestamp(),
				},
			},
		},
		{ merge: true }
	);
	await removeOldBundles(bucket, `${BUNDLE_FOLDER}/${featureKey}`, path);

	return {
		kind: 'feature',
		key: featureKey,
		path,
		count: snapshot.size,
		bytes: gzipped.length,
		collections: null,
	};
}

/**
 * Egy műfaj szelete, ahogy a build-genre-bundles.mjs vágja: az előadó és az
 * album viszi a műfajt, a track az albumáét, a tagság a zenekaráét, a zenész
 * pedig minden zenekaráét, amiben játszott.
 *
 * Az egész katalógust végig kell olvasni, mert a tagság nem mondja meg
 * magáról, melyik műfajba tartozik — de csak a kért műfaj dokumentumai
 * maradnak a memóriában.
 */
export async function genreSlice(
	database: Firestore,
	slug: string,
	genreOf: Map<unknown, string>
): Promise<DocumentSnapshot[]> {
	const slice: DocumentSnapshot[] = [];
	const keep = (
		documentSlug: string | null | undefined,
		document: DocumentSnapshot
	) => {
		if (documentSlug === slug) {
			slice.push(document);
		}
	};

	const artistSlug = new Map<string, string | undefined>();
	const artists = await database.collectionGroup('artist').get();

	for (const artist of artists.docs) {
		const artistGenre = genreOf.get(artist.get('genre'));

		artistSlug.set(artist.id, artistGenre);
		keep(artistGenre, artist);
	}

	const albumSlug = new Map<string, string | undefined>();
	const albums = await database.collectionGroup('album').get();

	for (const album of albums.docs) {
		// Az album saját műfaja, vagy a zenekaráé, ha neki nincs.
		const albumGenre =
			genreOf.get(album.get('genre')) ??
			artistSlug.get(album.ref.parent.parent?.id ?? '');

		albumSlug.set(album.id, albumGenre);
		keep(albumGenre, album);
	}

	const tracks = await database.collectionGroup('track').get();

	for (const track of tracks.docs) {
		keep(albumSlug.get(track.get('albumUid')), track);
	}

	/** A zenészek, akik ebben a műfajban játszottak. */
	const musicians = new Set<string>();
	const memberships = await database.collectionGroup('membership').get();

	for (const membership of memberships.docs) {
		const membershipGenre = artistSlug.get(membership.get('artistUid'));

		if (membershipGenre === slug && membership.get('musicianUid')) {
			musicians.add(membership.get('musicianUid'));
		}
		keep(membershipGenre, membership);
	}

	const contributions = await database.collectionGroup('contribution').get();

	for (const contribution of contributions.docs) {
		const contributionGenre = albumSlug.get(contribution.get('albumUid'));

		if (contributionGenre === slug && contribution.get('musicianUid')) {
			musicians.add(contribution.get('musicianUid'));
		}
		keep(contributionGenre, contribution);
	}

	const musicianDocuments = await database.collectionGroup('musician').get();

	for (const musician of musicianDocuments.docs) {
		if (musicians.has(musician.id)) {
			slice.push(musician);
		}
	}

	return slice;
}

async function rebuildGenreBundle(
	database: Firestore,
	bucket: BundleBucket,
	slug: string
): Promise<CatalogBundleRebuildResult> {
	const [catalog, taxonomy] = await Promise.all([
		catalogReference(database).get(),
		database.collection(GENRE_COLLECTION).get(),
	]);

	if (!taxonomy.docs.some((document) => document.id === slug)) {
		throw new CatalogBundleError(
			'invalid-argument',
			`Nincs ilyen műfaj a taxonómiában: ${slug}`
		);
	}

	// A bundle a benne lévő feature-ök legújabb verziójáig ér: aki
	// betöltötte, mind a hattal naprakész.
	const version = newestOf(
		GENRE_BUNDLE_FEATURE_KEYS.map(
			(key) => catalog.get(`modifiedAt.${key}`) as Timestamp | undefined
		)
	);

	if (!version) {
		throw new CatalogBundleError(
			'failed-precondition',
			'A katalógusnak nincs verziója a sync/catalog-ban.'
		);
	}

	// A dokumentumok a műfaj nevét írják (`album.genre`), a bundle a slugot.
	const genreOf = new Map<unknown, string>(
		taxonomy.docs.map((document) => [document.get('name'), document.id])
	);
	const documents = await genreSlice(database, slug, genreOf);

	if (!documents.length) {
		throw new CatalogBundleError(
			'failed-precondition',
			'Ebben a műfajban még nincs egyetlen előadó vagy album sem.'
		);
	}

	const builder = database.bundle(`genre-${slug}-${version.seconds}`);

	for (const document of documents) {
		builder.add(document);
	}

	const gzipped = gzipSync(buildBundle(builder));
	const path = `${GENRE_BUNDLE_FOLDER}/${slug}/${version.seconds}.bundle`;

	await uploadBundle(bucket, path, gzipped);
	await catalogReference(database).set(
		{
			genreBundles: {
				[slug]: {
					path,
					modifiedAt: version,
					count: documents.length,
					builtAt: FieldValue.serverTimestamp(),
				},
			},
		},
		{ merge: true }
	);
	await removeOldBundles(bucket, `${GENRE_BUNDLE_FOLDER}/${slug}`, path);

	return {
		kind: 'genre',
		key: slug,
		path,
		count: documents.length,
		bytes: gzipped.length,
		collections: null,
	};
}
