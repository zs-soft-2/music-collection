/**
 * A napi kérdés ranglistája: egy dokumentum, naponta újraépítve.
 *
 * Miért egy dokumentum, és miért nem kliens-lekérdezés: az élő ranglista
 * látogatónként egy lekérdezés lenne, és a mezőny növekedésével romlana. Így
 * a látogató EGY dokumentumot olvas, a mezőnyt pedig egyedül ez a futás
 * olvassa végig.
 *
 * A saját helyezés nem ebből a dokumentumból jön: a futás beleírja minden
 * játékos saját kasszájába (`user/{uid}/game/daily-question`), amit a lap
 * amúgy is követ. Így a huszadik hely alatt álló gyűjtő is látja, hol tart,
 * anélkül hogy a ranglistában ezer sor utazna.
 *
 * A helyezés ezért annyira friss, amennyire az utolsó futás: a mai tippel
 * szerzett pont már a kasszában van, a hely viszont a tegnapi mezőnyé.
 */

import { Firestore } from 'firebase-admin/firestore';

import { DAILY_QUESTION_GAME_DOCUMENT, GAME_COLLECTION } from './daily-answer';

const USER_COLLECTION = 'user';
/** A ranglisták, játékonként egy dokumentum. */
export const LEADERBOARD_COLLECTION = 'leaderboard';
export const DAILY_QUESTION_LEADERBOARD_DOCUMENT = 'daily-question';

/**
 * Ennyi kasszát olvasunk el egy futásban. A mezőny ma ennek a töredéke; a
 * korlát azért van, hogy egy elszaladt regisztráció-hullám se tegyen egy
 * ütemezett futást megfizethetetlenné.
 */
export const MAX_PLAYERS = 5000;
/** Egy köteg ennyi írást bír el (a Firestore 500-nál vág). */
const BATCH_SIZE = 400;

export interface LeaderboardRow {
	/** 1-től; az azonos pontszám azonos helyezés. */
	rank: number;
	uid: string;
	/** A gyűjtő neve, ahogy a profiljában áll; üres, ha nincs neki. */
	name: string;
	points: number;
	streak: number;
	longestStreak: number;
	answered: number;
	correct: number;
}

export interface LeaderboardDocument {
	rows: LeaderboardRow[];
	players: number;
	updatedAt: number;
}

export interface RefreshLeaderboardResult {
	players: number;
	/** Ennyi kasszába került új helyezés; a többibe nem kellett írni. */
	ranked: number;
}

/** Egy kassza, ahogy a rangsoroláshoz kell. */
interface Standing {
	uid: string;
	points: number;
	streak: number;
	longestStreak: number;
	answered: number;
	correct: number;
	/** Ami a kasszában áll ma; enélkül minden futás mindenkinek írna. */
	storedRank: number | null;
	storedPlayers: number | null;
}

/**
 * A rangsor: pont szerint, döntetlennél a hosszabb sorozat, aztán a több
 * találat. Az azonos pontszám azonos helyezés — aki holtversenyben áll,
 * ugyanazt a helyet kapja, a következő pedig annyival lejjebb, ahányan
 * előtte állnak.
 */
export function rankStandings<
	T extends {
		points: number;
		longestStreak: number;
		correct: number;
		uid: string;
	},
>(standings: T[]): (T & { rank: number })[] {
	const sorted = [...standings].sort(
		(left, right) =>
			right.points - left.points ||
			right.longestStreak - left.longestStreak ||
			right.correct - left.correct ||
			left.uid.localeCompare(right.uid)
	);
	let rank = 0;
	let previous: number | null = null;

	return sorted.map((standing, index) => {
		if (previous === null || standing.points !== previous) {
			rank = index + 1;
			previous = standing.points;
		}

		return { ...standing, rank };
	});
}

/** A játékosok kasszái. A `game` alatt ma csak a napi kérdés kasszája él. */
async function readStandings(database: Firestore): Promise<Standing[]> {
	const snapshot = await database
		.collectionGroup(GAME_COLLECTION)
		.limit(MAX_PLAYERS)
		.get();

	return snapshot.docs
		.filter(
			(document) =>
				document.id === DAILY_QUESTION_GAME_DOCUMENT &&
				!!document.ref.parent.parent
		)
		.map((document) => ({
			uid: document.ref.parent.parent?.id as string,
			points: (document.get('points') as number) ?? 0,
			streak: (document.get('streak') as number) ?? 0,
			longestStreak: (document.get('longestStreak') as number) ?? 0,
			answered: (document.get('answered') as number) ?? 0,
			correct: (document.get('correct') as number) ?? 0,
			storedRank: (document.get('rank') as number | null) ?? null,
			storedPlayers: (document.get('players') as number | null) ?? null,
		}))
		.filter((standing) => standing.answered > 0);
}

/**
 * A lista élének nevei. Csak az élért olvasunk user-dokumentumot: a mezőny
 * többi tagja a saját kasszájából tudja meg a helyét, oda pedig nem kell név.
 */
async function readNames(
	database: Firestore,
	uids: string[]
): Promise<Map<string, string>> {
	if (!uids.length) return new Map();

	const documents = await database.getAll(
		...uids.map((uid) => database.collection(USER_COLLECTION).doc(uid))
	);

	return new Map(
		documents.map((document) => [
			document.id,
			((document.get('displayName') as string | null) ?? '').trim(),
		])
	);
}

/** Kötegelt írás; a Firestore 500-as korlátja alatt marad. */
async function commitInBatches(
	database: Firestore,
	writes: ((batch: FirebaseFirestore.WriteBatch) => void)[]
): Promise<void> {
	for (let index = 0; index < writes.length; index += BATCH_SIZE) {
		const batch = database.batch();

		writes
			.slice(index, index + BATCH_SIZE)
			.forEach((write) => write(batch));

		await batch.commit();
	}
}

/**
 * A ranglista újraépítése: a lista dokumentuma, és minden játékos kasszájába
 * a saját helyezése.
 *
 * A kasszába csak akkor írunk, ha a helyezés tényleg más lett — különben egy
 * mozdulatlan mezőny minden nap annyi írásba kerülne, ahányan vannak.
 */
export async function refreshDailyQuestionLeaderboard(
	database: Firestore,
	size: number,
	now: Date = new Date()
): Promise<RefreshLeaderboardResult> {
	const standings = await readStandings(database);
	const ranked = rankStandings(standings);
	const top = ranked.slice(0, Math.max(size, 0));
	const names = await readNames(
		database,
		top.map((standing) => standing.uid)
	);
	const rows: LeaderboardRow[] = top.map((standing) => ({
		rank: standing.rank,
		uid: standing.uid,
		name: names.get(standing.uid) ?? '',
		points: standing.points,
		streak: standing.streak,
		longestStreak: standing.longestStreak,
		answered: standing.answered,
		correct: standing.correct,
	}));
	const document: LeaderboardDocument = {
		rows,
		players: ranked.length,
		updatedAt: now.getTime(),
	};
	const changed = ranked.filter(
		(standing) =>
			standing.storedRank !== standing.rank ||
			standing.storedPlayers !== ranked.length
	);

	await database
		.collection(LEADERBOARD_COLLECTION)
		.doc(DAILY_QUESTION_LEADERBOARD_DOCUMENT)
		.set(document);

	await commitInBatches(
		database,
		changed.map(
			(standing) => (batch: FirebaseFirestore.WriteBatch) =>
				batch.set(
					database
						.collection(USER_COLLECTION)
						.doc(standing.uid)
						.collection(GAME_COLLECTION)
						.doc(DAILY_QUESTION_GAME_DOCUMENT),
					{
						rank: standing.rank,
						players: ranked.length,
						updatedAt: now.getTime(),
					},
					{ merge: true }
				)
		)
	);

	return { players: ranked.length, ranked: changed.length };
}
