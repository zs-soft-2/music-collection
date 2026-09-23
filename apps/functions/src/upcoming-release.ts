/**
 * Ami még nem jelent meg: a katalógus előadóinak következő lemezei.
 *
 * A MusicBrainz release-keresése dátumtartományra is válaszol, de egy
 * keresésből legfeljebb 500 találatot ad ki (`offset + limit <= 500`), és a
 * világ egy hónapja ennél jóval több — a puszta dátumszűrés tehát a lemezek
 * egy önkényes ötödét látná csak. Ezért a kérdést az előadókra szabjuk:
 * kötegenként tizenöt előadó (MusicBrainz id, annak híján a név) egy
 * keresésben, a dátumtartománnyal együtt. Egy köteg néhány találat, a
 * katalógus mérete pedig a kérések számát szabja meg, nem a világé.
 *
 * A keresés csak jelölteket hoz: hogy a lemez tényleg a katalógus előadójáé-e,
 * azt a `matchArtist` dönti el itt, id-re vagy normalizált névre.
 *
 * Egy dokumentum egy release group (az album), nem egy nyomás: a nyomásokból
 * a formátum, a kiadó és az ország marad meg összefésülve, mert a gyűjtőnek
 * az számít, jön-e bakeliten egyáltalán.
 *
 * Amit a keresés nem mond meg, az a `first-release-date` — enélkül nem
 * látszik, új lemezről vagy újrakiadásról van-e szó. Ezt csak a megmaradt,
 * párosított albumokra kérdezzük meg külön (naponta néhány kérés), és csak
 * akkor, ha még nincs meg a korábbi futásból.
 */

import { FieldValue, Firestore } from 'firebase-admin/firestore';

import { stamp, tombstone } from './catalog-sync';
import { normalize } from './discogs-match';
import { MusicBrainzRequestOptions, musicBrainzGet } from './musicbrainz-api';

const ARTIST_COLLECTION = 'artist';
export const UPCOMING_RELEASE_COLLECTION = 'upcoming-release';
/** `libs/common/api` EntityTypeEnum.UpcomingRelease. */
const ENTITY_TYPE = 'Upcoming Release';
/** Ennyi napra előre nézünk. Egy hónap plusz a szokásos csúszás. */
export const WINDOW_DAYS = 35;
/** A keresés lapmérete; a MusicBrainz ennél nagyobbat nem ad. */
const PAGE_SIZE = 100;
/**
 * Egy keresésből ennyi találat kérhető el összesen: az 500. fölötti offsetre
 * a MusicBrainz 400-at ad. A kötegek ezért kicsik — egy köteg találatai
 * ebbe bőven beleférnek.
 */
const MAX_RESULTS = 500;
/**
 * Ennyi előadó megy egy keresésbe. A Lucene-lekérdezés hossza és a köteg
 * találatszáma is ezen múlik; tizenöt előadónak egy hónap alatt ritkán van
 * száz kiadása.
 */
export const ARTISTS_A_QUERY = 15;
/** Egy Firestore batch 500 művelet; a szinkron-bump is elfér mellette. */
const BATCH_LIMIT = 400;

/** A katalógus előadója, amennyi a párosításhoz kell. */
export interface CatalogArtist {
	uid: string;
	name: string;
	musicBrainzId: string | null;
	imageUrl: string | null;
}

export interface MusicBrainzSearchRelease {
	id: string;
	title?: string;
	date?: string | null;
	country?: string | null;
	'artist-credit'?: {
		name?: string;
		joinphrase?: string;
		artist?: { id?: string; name?: string };
	}[];
	'release-group'?: {
		id: string;
		title?: string;
		'primary-type'?: string | null;
		'secondary-types'?: string[];
	};
	'label-info'?: { label?: { name?: string } | null }[];
	media?: { format?: string | null }[];
}

export interface MusicBrainzReleaseSearch {
	count?: number;
	releases?: MusicBrainzSearchRelease[];
}

export interface MusicBrainzReleaseGroup {
	id: string;
	'first-release-date'?: string | null;
	'primary-type'?: string | null;
	'secondary-types'?: string[];
}

/** Egy megjelenés úgy, ahogy a Firestore-ba kerül. */
export interface UpcomingReleaseDocument {
	artistUid: string | null;
	artistName: string;
	artistImageUrl: string | null;
	countries: string[];
	entityType: string;
	firstReleaseDate: string | null;
	formats: string[];
	labels: string[];
	matchedBy: 'musicBrainzId' | 'name';
	musicBrainzArtistIds: string[];
	primaryType: string | null;
	releaseDate: string;
	releaseGroupId: string;
	secondaryTypes: string[];
	title: string;
	uid: string;
}

/** Csak a teljes dátumot fogadjuk el: "2026" vagy "2026-10" nem nap. */
const EXACT_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A nap `YYYY-MM-DD` alakban, UTC szerint. */
export function isoDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Az ablak első és utolsó napja, a mai naptól előre. */
export function releaseWindow(
	today: Date,
	days: number = WINDOW_DAYS
): { from: string; to: string } {
	const end = new Date(today.getTime());

	end.setUTCDate(end.getUTCDate() + days);

	return { from: isoDay(today), to: isoDay(end) };
}

/**
 * A katalógus előadói kereshető alakban. Az azonos nevű előadók nevét
 * kihagyjuk: a névre párosítás névrokonokat is behúzna, és nem tudnánk
 * eldönteni, melyikről van szó — a MusicBrainz id-s párosítás ilyenkor is
 * megmarad.
 */
export function indexArtists(artists: CatalogArtist[]): {
	byMusicBrainzId: Map<string, CatalogArtist>;
	byName: Map<string, CatalogArtist>;
} {
	const byMusicBrainzId = new Map<string, CatalogArtist>();
	const byName = new Map<string, CatalogArtist>();
	const ambiguous = new Set<string>();

	for (const artist of artists) {
		if (artist.musicBrainzId) {
			byMusicBrainzId.set(artist.musicBrainzId.toLowerCase(), artist);
		}

		const key = normalize(artist.name);

		if (!key) continue;

		if (byName.has(key)) {
			ambiguous.add(key);
		} else {
			byName.set(key, artist);
		}
	}

	for (const key of ambiguous) {
		byName.delete(key);
	}

	return { byMusicBrainzId, byName };
}

type ArtistIndex = ReturnType<typeof indexArtists>;

interface Match {
	artist: CatalogArtist;
	matchedBy: 'musicBrainzId' | 'name';
}

/**
 * A kiadás előadója a katalógusban. Előbb a MusicBrainz id dönt, utána a
 * név; a közreműködők közül az első találat nyer, mert a lemez az övé.
 */
export function matchArtist(
	release: MusicBrainzSearchRelease,
	index: ArtistIndex
): Match | null {
	const credits = release['artist-credit'] ?? [];

	for (const credit of credits) {
		const id = credit.artist?.id?.toLowerCase();
		const artist = id ? index.byMusicBrainzId.get(id) : undefined;

		if (artist) return { artist, matchedBy: 'musicBrainzId' };
	}

	for (const credit of credits) {
		const key = normalize(credit.artist?.name ?? credit.name ?? '');
		const artist = key ? index.byName.get(key) : undefined;

		if (artist) return { artist, matchedBy: 'name' };
	}

	return null;
}

/** "Artist A feat. Artist B" — ahogy a MusicBrainz kiírja a közreműködőket. */
export function creditedName(release: MusicBrainzSearchRelease): string {
	const credits = release['artist-credit'] ?? [];

	if (!credits.length) return '';

	return credits
		.map(
			(credit) =>
				`${credit.name ?? credit.artist?.name ?? ''}${credit.joinphrase ?? ''}`
		)
		.join('')
		.trim();
}

const distinct = (values: (string | null | undefined)[]): string[] => [
	...new Set(
		values
			.map((value) => (value ?? '').trim())
			.filter((value): value is string => !!value)
	),
];

/**
 * A keresés találataiból a katalógus előadóira szűrt, albumonként
 * összefésült lista. Az azonos release grouphoz tartozó nyomások
 * összeolvadnak, és a legkorábbi nap marad — az a megjelenés napja.
 */
export function foldUpcomingReleases(
	releases: MusicBrainzSearchRelease[],
	index: ArtistIndex,
	window: { from: string; to: string }
): UpcomingReleaseDocument[] {
	const folded = new Map<string, UpcomingReleaseDocument>();

	for (const release of releases) {
		const date = release.date ?? '';
		const group = release['release-group'];

		if (!group?.id) continue;
		if (!EXACT_DATE.test(date)) continue;
		if (date < window.from || date > window.to) continue;

		const match = matchArtist(release, index);

		if (!match) continue;

		const formats = (release.media ?? []).map((medium) => medium.format);
		const labels = (release['label-info'] ?? []).map(
			(info) => info.label?.name
		);
		const existing = folded.get(group.id);

		if (existing) {
			existing.releaseDate =
				date < existing.releaseDate ? date : existing.releaseDate;
			existing.formats = distinct([...existing.formats, ...formats]);
			existing.labels = distinct([...existing.labels, ...labels]);
			existing.countries = distinct([
				...existing.countries,
				release.country,
			]);

			continue;
		}

		folded.set(group.id, {
			artistUid: match.artist.uid,
			artistName: creditedName(release) || match.artist.name,
			artistImageUrl: match.artist.imageUrl,
			countries: distinct([release.country]),
			entityType: ENTITY_TYPE,
			firstReleaseDate: null,
			formats: distinct(formats),
			labels: distinct(labels),
			matchedBy: match.matchedBy,
			musicBrainzArtistIds: distinct(
				(release['artist-credit'] ?? []).map(
					(credit) => credit.artist?.id
				)
			),
			primaryType: group['primary-type'] ?? null,
			releaseDate: date,
			releaseGroupId: group.id,
			secondaryTypes: distinct(group['secondary-types'] ?? []),
			title: group.title ?? release.title ?? '',
			uid: group.id,
		});
	}

	return [...folded.values()].sort(
		(a, b) =>
			a.releaseDate.localeCompare(b.releaseDate) ||
			a.artistName.localeCompare(b.artistName)
	);
}

/**
 * A Lucene lekérdezés-nyelv jelei egy névben. A `/` a legfontosabb közülük:
 * az AC/DC-ből enélkül reguláris kifejezés lenne, és a keresés 400-zal
 * szállna el.
 */
const LUCENE_SPECIAL = /([+\-&|!(){}[\]^"~*?:\\/])/g;

export const escapeLucene = (value: string): string =>
	value.replace(LUCENE_SPECIAL, '\\$1');

/**
 * Egy előadó keresési feltétele: a MusicBrainz id, ha tudjuk — az pontos —,
 * különben a neve. A névre kapott találatokat a `matchArtist` úgyis
 * felülbírálja, ez csak a jelölteket hozza közelebb.
 */
export function artistClause(artist: CatalogArtist): string | null {
	if (artist.musicBrainzId) return `arid:${artist.musicBrainzId}`;

	const name = artist.name.trim();

	return name ? `artist:"${escapeLucene(name)}"` : null;
}

/** Az előadók kötegekre bontva, ahogy egy-egy keresésbe kerülnek. */
export function toQueryBatches(
	artists: CatalogArtist[],
	size: number = ARTISTS_A_QUERY
): string[][] {
	const clauses = artists
		.map(artistClause)
		.filter((clause): clause is string => !!clause);
	const batches: string[][] = [];

	for (let start = 0; start < clauses.length; start += size) {
		batches.push(clauses.slice(start, start + size));
	}

	return batches;
}

/**
 * Az ablakba eső hivatalos kiadások a megadott előadókra. Egy köteg egy
 * keresés, lapozva — a lapozás az 500-as korlátig mehet, de egy köteg
 * ritkán ad többet néhány tucatnál.
 */
export async function fetchReleasesForArtists(
	artists: CatalogArtist[],
	window: { from: string; to: string },
	options: MusicBrainzRequestOptions = {}
): Promise<MusicBrainzSearchRelease[]> {
	const releases: MusicBrainzSearchRelease[] = [];

	for (const batch of toQueryBatches(artists)) {
		const query = `(${batch.join(' OR ')}) AND date:[${window.from} TO ${window.to}] AND status:official`;

		for (let offset = 0; offset < MAX_RESULTS; offset += PAGE_SIZE) {
			const result = await musicBrainzGet<MusicBrainzReleaseSearch>(
				'/release',
				{ query, limit: PAGE_SIZE, offset },
				options
			);
			const page = result.releases ?? [];

			releases.push(...page);

			if (page.length < PAGE_SIZE) break;
			if (offset + page.length >= (result.count ?? 0)) break;
		}
	}

	return releases;
}

/**
 * Az album első megjelenése. Csak azokra kérdezzük meg, amelyeknél még nem
 * tudjuk: enélkül nem látszana, hogy újrakiadásról van szó.
 */
export async function fillFirstReleaseDates(
	documents: UpcomingReleaseDocument[],
	known: Map<string, string | null>,
	options: MusicBrainzRequestOptions = {}
): Promise<void> {
	for (const document of documents) {
		if (known.has(document.releaseGroupId)) {
			document.firstReleaseDate =
				known.get(document.releaseGroupId) ?? null;

			continue;
		}

		try {
			const group = await musicBrainzGet<MusicBrainzReleaseGroup>(
				`/release-group/${document.releaseGroupId}`,
				{},
				options
			);

			document.firstReleaseDate = group['first-release-date'] || null;
			document.primaryType =
				group['primary-type'] ?? document.primaryType;
			document.secondaryTypes = distinct([
				...document.secondaryTypes,
				...(group['secondary-types'] ?? []),
			]);
		} catch {
			// Egy hiányzó release group nem ér annyit, hogy elvigye az
			// egész futást: a lemez enélkül is kikerül, csak nem tudjuk
			// róla, hogy újrakiadás.
			document.firstReleaseDate = null;
		}
	}
}

/** A katalógus előadói; csak az kell belőlük, amin a párosítás áll. */
export async function loadCatalogArtists(
	database: Firestore
): Promise<CatalogArtist[]> {
	const snapshot = await database
		.collection(ARTIST_COLLECTION)
		.select('name', 'musicBrainzId', 'imageUrl', 'discogs')
		.get();

	return snapshot.docs.map((document) => {
		const discogs = document.get('discogs') as
			{ imageUrl?: string | null } | undefined;

		return {
			uid: document.id,
			name: (document.get('name') as string) ?? '',
			musicBrainzId:
				(document.get('musicBrainzId') as string | null) ?? null,
			imageUrl:
				(document.get('imageUrl') as string | null) ??
				discogs?.imageUrl ??
				null,
		};
	});
}

export interface SyncResult {
	/** Ahány kiadást a keresések összesen hoztak, párosítás előtt. */
	scanned: number;
	/** Ahány album a katalógus előadóihoz tartozik. */
	matched: number;
	written: number;
	deleted: number;
}

/**
 * Egy futás: lekérdezés, párosítás, és a különbség kiírása. Ami már nincs a
 * listán — mert megjelent, elcsúszott, vagy törölték a MusicBrainzről —,
 * markerrel együtt törlődik, hogy a kliens-cache-ből is eltűnjön.
 */
export async function syncUpcomingReleases(
	database: Firestore,
	options: {
		today?: Date;
		windowDays?: number;
		request?: MusicBrainzRequestOptions;
	} = {}
): Promise<SyncResult> {
	const window = releaseWindow(
		options.today ?? new Date(),
		options.windowDays ?? WINDOW_DAYS
	);
	const [artists, existing] = await Promise.all([
		loadCatalogArtists(database),
		database.collection(UPCOMING_RELEASE_COLLECTION).get(),
	]);
	const releases = await fetchReleasesForArtists(
		artists,
		window,
		options.request
	);
	const documents = foldUpcomingReleases(
		releases,
		indexArtists(artists),
		window
	);
	const known = new Map<string, string | null>(
		existing.docs
			.filter(
				(document) => document.get('firstReleaseDate') !== undefined
			)
			.map((document) => [
				document.id,
				(document.get('firstReleaseDate') as string | null) ?? null,
			])
	);

	await fillFirstReleaseDates(documents, known, options.request);

	const keep = new Set(documents.map((document) => document.uid));
	const stale = existing.docs.filter((document) => !keep.has(document.id));

	await writeUpcomingReleases(database, documents, stale);

	return {
		scanned: releases.length,
		matched: documents.length,
		written: documents.length,
		deleted: stale.length,
	};
}

/** A kiírás batchekben, minden batch végén a kliens-cache bumpjával. */
async function writeUpcomingReleases(
	database: Firestore,
	documents: UpcomingReleaseDocument[],
	stale: { ref: FirebaseFirestore.DocumentReference }[]
): Promise<void> {
	const collection = database.collection(UPCOMING_RELEASE_COLLECTION);
	const operations: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [
		...documents.map(
			(document) => (batch: FirebaseFirestore.WriteBatch) =>
				batch.set(collection.doc(document.uid), stamp(document))
		),
		...stale.map((document) => (batch: FirebaseFirestore.WriteBatch) => {
			const marker = tombstone(database, document.ref);

			batch.delete(document.ref);
			batch.set(marker.reference, marker.data);
		}),
	];

	if (!operations.length) return;

	for (let start = 0; start < operations.length; start += BATCH_LIMIT) {
		const batch = database.batch();

		for (const operation of operations.slice(start, start + BATCH_LIMIT)) {
			operation(batch);
		}

		// A szinkron-bump minden batch végére kell, különben a kliens a
		// felét nem venné észre. A `touchCatalog` tranzakcióra íródott, a
		// batch ugyanezt az egy `set`-et teszi meg helyette.
		batch.set(
			database.collection('sync').doc('catalog'),
			{
				modifiedAt: {
					[UPCOMING_RELEASE_COLLECTION]: FieldValue.serverTimestamp(),
				},
			},
			{ merge: true }
		);

		await batch.commit();
	}
}
