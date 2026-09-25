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
} from './daily-question';
import { randomDocuments } from './daily-question-compose';

export const BAND_OF_THE_WEEK_COLLECTION = 'band-of-the-week';

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';

/**
 * Ennyi előadót húzunk, amíg találunk olyat, aki megállja a helyét a home
 * főhelyén. Egy húzás néhány olvasás, és hetente egyszer fut.
 */
export const MAX_TRIES = 8;
/** Ennyi lemezét nézzük meg annak, akit húztunk. */
const ALBUM_LIMIT = 30;
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
	/** Hányadik húzásra állt össze. */
	tries: number;
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
export function isEligible(candidate: Candidate): boolean {
	return candidate.playableAlbums >= MIN_PLAYABLE_ALBUMS;
}

/** Egy húzott előadó és a lemezei — egy lekérdezés az albumaira. */
export async function measureCandidate(
	database: Firestore,
	document: FirebaseFirestore.DocumentSnapshot
): Promise<Candidate> {
	const albums = await database
		.collection(ARTIST_COLLECTION)
		.doc(document.id)
		.collection(ALBUM_COLLECTION)
		.limit(ALBUM_LIMIT)
		.get();

	return {
		uid: document.id,
		name: (document.get('name') as string) ?? '',
		albumCount: albums.size,
		playableAlbums: albums.docs.map(toCandidateAlbum).filter(isPlayable)
			.length,
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
 * A véletlen a hétből származik, ezért ugyanaz a hét ugyanazzal a húzással
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
			reason: 'exists',
		};
	}

	const random = createRandom(hashSeed(week));
	const recent = await recentArtists(database, week);
	const artists = database.collection(ARTIST_COLLECTION);

	for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
		const [document] = await randomDocuments(artists, random, 1);

		if (!document) {
			break;
		}

		const candidate = await measureCandidate(database, document);

		if (!isEligible(candidate)) {
			continue;
		}
		// A múlt heteket inkább újrahúzzuk — de az utolsó húzásnál a
		// semminél a visszatérő zenekar is jobb.
		if (recent.has(candidate.uid) && attempt < MAX_TRIES) {
			continue;
		}

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
			tries: attempt,
			reason: 'created',
		};
	}

	return {
		week,
		created: false,
		artistUid: null,
		artistName: null,
		tries: MAX_TRIES,
		reason: 'no-material',
	};
}
