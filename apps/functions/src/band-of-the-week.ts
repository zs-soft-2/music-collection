/**
 * A hét bandája: egy előadó egy hétre, mindenkinek ugyanaz.
 *
 * Dokumentum: `band-of-the-week/{hét}`, az ISO hét (`YYYY-Www`) az
 * azonosítója. Az éjszakai futás írja (`composeBandOfTheWeekDaily`), és csak
 * akkor, ha a hétnek még nincs zenekara — a kliensből soha.
 *
 * A dokumentum szándékosan sovány: az előadó azonosítója és a neve, meg hogy
 * miért ő. A képe, a stílusai és a lemezei a katalógusból jönnek, ami a
 * kliens cache-ében amúgy is ott van — ide másolva a hét közben elavulnának.
 *
 * A választás ma véletlen, de az apropó mezője már itt van: a motor később
 * évfordulóval, születésnappal vagy közelgő megjelenéssel bővül anélkül,
 * hogy a dokumentum alakja változna.
 */

import { Firestore } from 'firebase-admin/firestore';

import { stamp } from './catalog-sync';
import {
	GAME_TIME_ZONE,
	createRandom,
	gameDay,
	hashSeed,
	shuffle,
} from './daily-question';

export const BAND_OF_THE_WEEK_COLLECTION = 'band-of-the-week';

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';

/**
 * Ennyi jelöltet próbálunk végig a sorból. Nem a választás ereje múlik rajta,
 * csak fék: a jelölt azonosítója a lemeze útjából jön, az előadó lapja viszont
 * elvben hiányozhat mellőle.
 */
export const MAX_TRIES = 8;
/**
 * Ennyi lejátszható lemeznél többet egy választás nem olvas végig. Hetente
 * egyszer fut, és a mai dev katalógusban 55 ilyen lemez van — a korlát a
 * katalógus növekedése elleni fék, nem a mai méret kérdése.
 */
const PLAYABLE_SCAN_LIMIT = 20000;
/** Ennyi lejátszható lemez kell, hogy a rádió is megálljon rajta. */
export const MIN_PLAYABLE_ALBUMS = 3;
/**
 * Ennyi hétre nézünk vissza, hogy ne ugyanaz a zenekar jöjjön újra. Egyetlen
 * lekérdezés, ennyi olvasás — a kimaradt hetek nem számítanak bele, tehát ez
 * „az utolsó N banda”, nem „az utolsó N naptári hét”.
 */
export const RECENT_WEEKS = 12;

/** Miért ő a hét bandája. Ma csak véletlen; a többi a motor bővítése. */
export type BandOfTheWeekReason =
	/** Nem volt apropó: húztuk. */
	| 'random'
	/** Ezen a héten évfordulós valamelyik lemezük. */
	| 'anniversary'
	/** A héten került be tőlük a legtöbb lemez a katalógusba. */
	| 'new-in-catalog'
	/** Jön a lemezük. */
	| 'upcoming';

/**
 * A hét bandája, ahogy a Firestore-ban áll.
 *
 * Ugyanez az alak él a `libs/api` alatt is (`BandOfTheWeek`), mert a
 * functions build nem látja a libeket. A kettőnek egyet kell mondania.
 */
export interface BandOfTheWeekDocument {
	/** Az ISO hét, `YYYY-Www`; egyben a dokumentum azonosítója. */
	week: string;
	/** A hét hétfője és vasárnapja, `YYYY-MM-DD` — a felirat ezt mondja ki. */
	startDay: string;
	endDay: string;
	artistUid: string;
	/** A neve akkor is, ha az előadót később törölnék a katalógusból. */
	artistName: string;
	reason: BandOfTheWeekReason;
	/** Az apropó szövegének katalógusértékei (év, lemezcím) — ma üres. */
	reasonParams: Record<string, string>;
	/** Hány lemeze van a katalógusban, és mennyi ebből a lejátszható. */
	albumCount: number;
	playableAlbums: number;
	/** Mikor választotta a futás, epoch milliszekundum. */
	pickedAt: number;
}

/** Amit a választás visszamond a naplónak és az adminnak. */
export interface BandOfTheWeekResult {
	week: string;
	created: boolean;
	artistUid: string | null;
	artistName: string | null;
	/** Hányadik jelöltnél állt meg a sor. */
	tries: number;
	/** A választott zenekar lejátszható lemezei. */
	playableAlbums: number;
	/**
	 * Hány zenekar közül választhatott. Ez mondja meg a naplóban, hogy egy
	 * bandátlan hét a katalóguson múlt-e, vagy a választáson.
	 */
	candidates: number;
	reason: 'created' | 'exists' | 'no-material';
}

// ── A hét ───────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** A `YYYY-MM-DD` mint UTC-dátum; a hét számolása napokkal megy, nem órákkal. */
const toDate = (day: string): Date => new Date(`${day}T00:00:00Z`);

const toDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Az ISO hét azonosítója (`2026-W39`) abból a napból, amelyik a játék
 * időzónájában éppen van.
 *
 * ISO szerint a hét hétfővel kezdődik, és az év első hete az, amelyikbe a
 * január 4. esik — ezért lehet január 1. még az előző év 52. hete. A
 * dokumentum azonosítója így hétről hétre növekvő szöveg marad, amire a
 * Firestore magától tart indexet.
 */
export function gameWeek(
	now: Date = new Date(),
	timeZone: string = GAME_TIME_ZONE
): string {
	return weekOf(gameDay(now, timeZone));
}

/** Ugyanaz egy megadott napból. */
export function weekOf(day: string): string {
	const date = toDate(day);
	// Csütörtök dönti el, melyik évhez tartozik a hét — ez az ISO szabály.
	const thursday = new Date(
		date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * DAY_MS
	);
	const firstThursday = toDate(`${thursday.getUTCFullYear()}-01-04`);
	const week =
		1 +
		Math.round(
			(thursday.getTime() -
				firstThursday.getTime() +
				((firstThursday.getUTCDay() + 6) % 7) * DAY_MS) /
				(7 * DAY_MS)
		);

	return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** A hét hétfője, `YYYY-MM-DD`. */
export function weekStart(week: string): string {
	const [year, index] = week.split('-W');
	const fourth = toDate(`${year}-01-04`);
	const firstMonday = new Date(
		fourth.getTime() - ((fourth.getUTCDay() + 6) % 7) * DAY_MS
	);

	return toDay(
		new Date(
			firstMonday.getTime() +
				(Number.parseInt(index, 10) - 1) * 7 * DAY_MS
		)
	);
}

/** …és a vasárnapja. */
export function weekEnd(week: string): string {
	return toDay(new Date(toDate(weekStart(week)).getTime() + 6 * DAY_MS));
}

// ── Jelöltek ────────────────────────────────────────────────────────────────

/** Egy album, amennyit a választás tud róla. */
interface CandidateAlbum {
	spotifyAlbumId: string | null;
	youtubePlaylistId: string | null;
	youtubeVideoIds: string[];
}

/**
 * Amit az app egyáltalán fel tud tenni. Ugyanaz a három forrás, amit a
 * lejátszó ismer — egy zenekar, akinek egyik lemeze sem szól, nem lehet a
 * hét bandája, mert a rádió elnémulna rajta.
 */
export function isPlayable(album: CandidateAlbum): boolean {
	return (
		!!album.spotifyAlbumId ||
		!!album.youtubePlaylistId ||
		album.youtubeVideoIds.length > 0
	);
}

const toCandidateAlbum = (
	document: FirebaseFirestore.DocumentSnapshot
): CandidateAlbum => ({
	spotifyAlbumId: (document.get('spotifyAlbumId') as string | null) ?? null,
	youtubePlaylistId:
		(document.get('youtubePlaylistId') as string | null) ?? null,
	youtubeVideoIds: (document.get('youtubeVideoIds') as string[]) ?? [],
});

/**
 * Ugyanaz a három forrás lekérdezésként, és az, amit náluk az „üres” jelent:
 * a két azonosítónál `null`, a videólistánál az üres tömb.
 *
 * Három lekérdezés, nem egy `Filter.or`: a Firestore egyetlen `!=` szűrőt
 * engedélyez lekérdezésenként („Only a single 'NOT_EQUAL' … filter allowed
 * per query”), tehát a hármat nem lehet egybefogni. Az `!=` a `null`-t és a
 * hiányzó mezőt is kiszűri, mert az egyenlőtlenség-szűrőből a Firestore
 * kihagyja azt, aminek a mezője nincs.
 *
 * Mindhárom mező collection-group hatókörű egymezős indexet kér
 * (`firestore.indexes.json`, `fieldOverrides`); index nélkül a lekérdezés
 * FAILED_PRECONDITION-nel áll meg.
 */
const PLAYABLE_SOURCES: [keyof CandidateAlbum, null | string[]][] = [
	['spotifyAlbumId', null],
	['youtubePlaylistId', null],
	['youtubeVideoIds', []],
];

/**
 * Kinek hány lejátszható lemeze van.
 *
 * Miért nem vaktában húzott előadókat mérünk (ez volt az első változat): a
 * katalógusban a lemezek töredékéhez van Spotify- vagy YouTube-azonosító —
 * devben 2817-ből 55 —, és a 735 előadóból hétnek van meg a három
 * lejátszható lemeze. Egy véletlen húzásnak így egy százalék esélye volt
 * megállni a főhelyen, nyolcnak nyolc: 2026-W40 és W41 bandátlan maradt. A
 * lejátszható lemezek viszont pont azért kevesen vannak, mert őket érdemes
 * megkérdezni — az útjukból (`artist/{uid}/album/{uid}`) az előadó is
 * kiderül, külön olvasás nélkül.
 *
 * A lekérdezés csak annyit tud, hogy a mező nem üres; hogy a lemez valóban
 * szól-e, itt az `isPlayable` dönti el.
 */
export async function playableAlbumCounts(
	database: Firestore
): Promise<Map<string, number>> {
	const albums = database.collectionGroup(ALBUM_COLLECTION);
	const fields = PLAYABLE_SOURCES.map(([field]) => field);
	const snapshots = await Promise.all(
		PLAYABLE_SOURCES.map(([field, empty]) =>
			albums
				.where(field, '!=', empty)
				.select(...fields)
				.limit(PLAYABLE_SCAN_LIMIT)
				.get()
		)
	);
	const counts = new Map<string, number>();
	const seen = new Set<string>();

	for (const document of snapshots.flatMap((snapshot) => snapshot.docs)) {
		const artist = document.ref.parent.parent?.id;

		// Egy lemez a három lekérdezésből többször is jöhet (Spotify és
		// YouTube is megvan hozzá) — egyszer számít.
		if (
			!artist ||
			seen.has(document.ref.path) ||
			!isPlayable(toCandidateAlbum(document))
		) {
			continue;
		}

		seen.add(document.ref.path);
		counts.set(artist, (counts.get(artist) ?? 0) + 1);
	}

	return counts;
}

/** Egy előadó, ahogy a választás méri. */
export interface Candidate {
	uid: string;
	name: string;
	albumCount: number;
	playableAlbums: number;
}

/**
 * Megáll-e a főhelyen: van-e elég lemeze, ami szól is.
 *
 * Képet szándékosan nem kérünk számon: a hero kép nélkül is összeáll (a
 * spotlight ma is megy stílus-háttérrel), és a kép megléte a katalógus
 * dolga, nem a választásé.
 */
export function isEligible(playableAlbums: number): boolean {
	return playableAlbums >= MIN_PLAYABLE_ALBUMS;
}

/**
 * A jelöltek sorrendje: az első, akinek az előadó-lapja megvan, lesz a hét
 * bandája.
 *
 * Négy sáv, ebben a rendben: aki megállja a helyét és nem volt soron
 * nemrég — aki megállja, de már volt — aki szűken van lemezzel, de nem volt
 * soron — végül a visszatérő szűkösök. A sávon belül a hét véletlene dönt
 * (a keverés sorrendjét a stabil rendezés nem bontja meg), a küszöb alatt
 * viszont a több lejátszható lemez előbb: ott már nem a választék a kérdés,
 * hanem hogy a rádió megszólal-e.
 *
 * A szűkös sávok azért vannak, mert a semminél a két lemezes zenekar is
 * jobb: a hero üresen hagyása a hetet a véletlen spotlightra fokozza le,
 * és a rádióból kiveszi a csatornát.
 */
export function candidateOrder(
	counts: Map<string, number>,
	recent: Set<string>,
	random: () => number
): string[] {
	const place = (uid: string): [number, number] => {
		const playable = counts.get(uid) ?? 0;
		const eligible = isEligible(playable);

		return [
			(eligible ? 0 : 2) + (recent.has(uid) ? 1 : 0),
			eligible ? 0 : -playable,
		];
	};
	const withAlbum = [...counts]
		.filter(([, playable]) => playable > 0)
		.map(([uid]) => uid);

	return shuffle(withAlbum, random).sort((first, second) => {
		const [band, playable] = place(first);
		const [otherBand, otherPlayable] = place(second);

		return band - otherBand || playable - otherPlayable;
	});
}

/**
 * A választott előadó lapja és a lemezei száma. A lejátszhatókat a
 * `playableAlbumCounts` már megszámolta, az összes lemez pedig egy
 * aggregáció — egy olvasás a harminc helyett, és nem vág el a limitnél.
 */
export async function measureCandidate(
	database: Firestore,
	document: FirebaseFirestore.DocumentSnapshot,
	playableAlbums: number
): Promise<Candidate> {
	const albums = await database
		.collection(ARTIST_COLLECTION)
		.doc(document.id)
		.collection(ALBUM_COLLECTION)
		.count()
		.get();

	return {
		uid: document.id,
		name: (document.get('name') as string) ?? '',
		albumCount: albums.data().count,
		playableAlbums,
	};
}

// ── A közelmúlt ─────────────────────────────────────────────────────────────

/**
 * Akik az utóbbi hetekben már sorra kerültek. Egy lekérdezés, a mostani hét
 * előttig — a rendezés a `week` mezőre megy, amire a Firestore egy mezőhöz
 * magától tart indexet.
 */
export async function recentArtists(
	database: Firestore,
	week: string,
	weeks = RECENT_WEEKS
): Promise<Set<string>> {
	const snapshot = await database
		.collection(BAND_OF_THE_WEEK_COLLECTION)
		.where('week', '<', week)
		.orderBy('week', 'desc')
		.limit(weeks)
		.get();

	return new Set(
		snapshot.docs
			.map((document) => (document.get('artistUid') as string) ?? '')
			.filter(Boolean)
	);
}

// ── A választás ─────────────────────────────────────────────────────────────

/**
 * A hét bandája. Idempotens: ha a hét dokumentuma megvan, nem ír újra — az
 * ütemező újrapróbálkozása nem cserélheti le a bandát a hét közben az alól,
 * aki már hallgatja.
 *
 * A véletlen a hétből származik, ezért ugyanaz a hét ugyanazzal a sorrenddel
 * indul: egy megismételt futás nem más zenekart talál, csak ugyanazt.
 */
export async function composeBandOfTheWeek(
	database: Firestore,
	options: {
		week?: string;
		today?: Date;
		/**
		 * Felülírja azt is, ami már megvan. Az ütemezett futás soha nem
		 * használja; ez a kézi cserének van itt, amikor lesz hozzá admin lap.
		 */
		force?: boolean;
	} = {}
): Promise<BandOfTheWeekResult> {
	const week = options.week ?? gameWeek(options.today ?? new Date());
	const reference = database
		.collection(BAND_OF_THE_WEEK_COLLECTION)
		.doc(week);
	const existing = await reference.get();

	if (existing.exists && !options.force) {
		return {
			week,
			created: false,
			artistUid: (existing.get('artistUid') as string) ?? null,
			artistName: (existing.get('artistName') as string) ?? null,
			tries: 0,
			playableAlbums: (existing.get('playableAlbums') as number) ?? 0,
			candidates: 0,
			reason: 'exists',
		};
	}

	const random = createRandom(hashSeed(week));
	const [recent, counts] = await Promise.all([
		recentArtists(database, week),
		playableAlbumCounts(database),
	]);
	const order = candidateOrder(counts, recent, random);
	const artists = database.collection(ARTIST_COLLECTION);
	const tried = order.slice(0, MAX_TRIES);

	for (const [index, uid] of tried.entries()) {
		const document = await artists.doc(uid).get();

		// A lemez megvan, az előadó lapja nem: a katalógusból kikerült,
		// miközben a lemezei ott maradtak. A sor következő jelöltje jön.
		if (!document.exists) {
			continue;
		}

		const candidate = await measureCandidate(
			database,
			document,
			counts.get(uid) ?? 0
		);

		await reference.set(
			stamp<BandOfTheWeekDocument>({
				week,
				startDay: weekStart(week),
				endDay: weekEnd(week),
				artistUid: candidate.uid,
				artistName: candidate.name,
				reason: 'random',
				reasonParams: {},
				albumCount: candidate.albumCount,
				playableAlbums: candidate.playableAlbums,
				pickedAt: Date.now(),
			})
		);

		return {
			week,
			created: true,
			artistUid: candidate.uid,
			artistName: candidate.name,
			tries: index + 1,
			playableAlbums: candidate.playableAlbums,
			candidates: order.length,
			reason: 'created',
		};
	}

	return {
		week,
		created: false,
		artistUid: null,
		artistName: null,
		tries: tried.length,
		playableAlbums: 0,
		candidates: order.length,
		reason: 'no-material',
	};
}
