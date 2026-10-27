/**
 * A napi kérdés kiértékelése: egy tipp egy napra.
 *
 * A kiértékelés azért van a szerveren, mert a megfejtés nem kerülhet a
 * kliens által olvasható dokumentumba: négy opciónál a hashelés értelmetlen
 * volna, mind a négyet végig lehetne próbálni. A tipp itt találkozik a
 * megfejtéssel, és ugyanitt születik a pont is — a kliens semmit nem ír
 * magának.
 *
 * Egy tipp: a második hívás nem értékel újra, hanem visszaadja az elsőt.
 * Tranzakcióban, mert a „megvolt-e már" kérdést és a pont könyvelését csak
 * együtt szabad eldönteni — két gyors kattintás különben kétszer fizetne.
 *
 * A pont a játék KÜLÖN kasszájába megy (`user/{uid}/game/daily-question`),
 * nem a collection-pontok közé: ott az a szabály, hogy semmi nem fizet a
 * collection befejezéséig, és ha a kvíz ugyanabba a kasszába csordogálna, ez
 * a szabály elveszítené az értelmét.
 */

import { Firestore } from 'firebase-admin/firestore';

import { stamp } from './catalog-sync';
import {
	DailyQuestionAnswer,
	QuestionDifficulty,
	QuestionOption,
	QuestionScoring,
	QuestionSubject,
	gameDay,
	previousDay,
} from './daily-question';
import {
	ANSWER_COLLECTION,
	ANSWER_DOCUMENT,
	DAILY_QUESTION_COLLECTION,
} from './daily-question-compose';

const USER_COLLECTION = 'user';
/** A gyűjtő saját tippjei: `user/{uid}/daily-answer/{nap}`. */
export const DAILY_ANSWER_COLLECTION = 'daily-answer';
/** A játékok kasszái a user alatt: `user/{uid}/game/{játék}`. */
export const GAME_COLLECTION = 'game';
/** A napi kérdés kasszája ebben. */
export const DAILY_QUESTION_GAME_DOCUMENT = 'daily-question';

/** Amiért a tipp nem értékelhető ki; a callable ezt fordítja hibakódra. */
export type DailyAnswerFailure =
	/** Nem a mai nap kérdésére jött a tipp — közben fordult a nap. */
	| 'stale-day'
	/** Aznap nincs kérdés: az összeállítás nem futott, vagy nem talált anyagot. */
	| 'no-question'
	/** A tipp nem a kérdés négy lehetősége közül való. */
	| 'unknown-option';

/**
 * A HttpsError-t szándékosan nem itt dobjuk: a `firebase-functions` betöltése
 * ESM-láncot húz be, amit a unit tesztek futtatója nem tud betölteni — a
 * kiértékelés maga pedig épp az, amit tesztelni akarunk. A callable fordítja
 * hibakódra (`index.ts`), ahogy a Discogs-hibákat is.
 */
export class DailyAnswerError extends Error {
	constructor(
		public readonly reason: DailyAnswerFailure,
		message: string
	) {
		super(message);
		this.name = 'DailyAnswerError';
	}
}

/**
 * Amit egy jó tipp fizet, nehézség szerint — ha a kérdés nem hozza magával a
 * saját pontozását. A mai kérdésekre rá van írva (`scoring`); ez azoknak
 * marad, amelyek még e nélkül álltak össze.
 */
export const POINTS: Record<QuestionDifficulty, number> = {
	easy: 10,
	medium: 20,
	hard: 30,
};

/** A sorozat naponta ennyit tesz a jó tipp mellé… */
export const STREAK_BONUS_PER_DAY = 2;
/** …de legföljebb ennyi napig; a hatodik naptól a bónusz nem nő tovább. */
export const MAX_STREAK_BONUS_DAYS = 5;

/**
 * Ennyi másodperc késést még elnézünk a határidőn túl.
 *
 * Az időt a kliens méri és küldi. Ez tudatos csere: a szerveren mért kör egy
 * plusz írás lenne naponta és játékosonként, a játék pedig játék. A szerver
 * azért nem hiszi el vakon — a hiányzó vagy képtelen érték a teljes
 * időkorlátnak számít, tehát a hazugság legföljebb annyit érhet, mint a
 * tisztességes, azonnali válasz.
 */
export const LATE_GRACE_SEC = 3;

/** A gyűjtő tippje egy napra. Ebben már benne van a megfejtés is. */
export interface DailyAnswerDocument {
	day: string;
	/** Amit a gyűjtő választott. */
	optionId: string;
	/** A helyes válasz; a tipp után már megmutatható. */
	answerId: string;
	correct: boolean;
	templateKey: string;
	difficulty: QuestionDifficulty;
	/** Amiről a kérdés szólt — a „tovább" linkhez. */
	subject: QuestionSubject;
	points: number;
	/** Hányadik napja sorban, ezzel a tippel együtt. */
	streak: number;
	/** A tipp ideje, epoch millisecundumban. */
	answeredAt: number;
	/** Ennyi másodpercig tartott a tipp; óra nélküli napon 0. */
	elapsedSec: number;
	/** Lejárt idő után érkezett: jó tipp is nullát fizet, és a sorozat szakad. */
	timedOut: boolean;
	/** Miből áll a pont — a lap ezt mutatja meg a tipp után. */
	breakdown: AnswerBreakdown;
}

/** A pont összetevői. Egy szám, aminek nincs elszámolása, nem jutalom. */
export interface AnswerBreakdown {
	/** Amit a nehézség fizet. */
	base: number;
	/** Amit a sorozat tett hozzá. */
	streakBonus: number;
	/** Amit a gyorsaság tett hozzá. */
	speedBonus: number;
	/** A nap szorzója; bónusz napon több mint 1. */
	multiplier: number;
}

/** A játék kasszája: ennyit gyűjtött össze a gyűjtő a napi kérdéssel. */
export interface DailyQuestionScoreDocument {
	points: number;
	streak: number;
	longestStreak: number;
	answered: number;
	correct: number;
	/** Az utolsó nap, amire tippelt, `YYYY-MM-DD`. */
	lastDay: string | null;
}

export const EMPTY_SCORE: DailyQuestionScoreDocument = {
	points: 0,
	streak: 0,
	longestStreak: 0,
	answered: 0,
	correct: 0,
	lastDay: null,
};

export interface AnswerResult {
	answer: DailyAnswerDocument;
	score: DailyQuestionScoreDocument;
	/** Hamis, ha aznap már volt tipp: a mostani nem számított bele. */
	graded: boolean;
}

/**
 * A tipp utáni sorozat. A rossz tipp nullázza — és a kihagyott nap is:
 * sorozatnak csak az egymást követő napok számítanak.
 */
export function streakAfter(
	score: DailyQuestionScoreDocument,
	day: string,
	correct: boolean
): number {
	if (!correct) return 0;

	return score.lastDay === previousDay(day) ? score.streak + 1 : 1;
}

/**
 * A nap pontozása a kérdésből. Ami e nélkül a mező nélkül állt össze — a
 * játék első napjai —, az a régi, kódba írt értékeket kapja.
 */
export function scoringOf(
	difficulty: QuestionDifficulty,
	scoring: Partial<QuestionScoring> | undefined | null
): QuestionScoring {
	return {
		base: scoring?.base ?? POINTS[difficulty] ?? POINTS.medium,
		streakBonusPerDay: scoring?.streakBonusPerDay ?? STREAK_BONUS_PER_DAY,
		maxStreakBonusDays:
			scoring?.maxStreakBonusDays ?? MAX_STREAK_BONUS_DAYS,
		speedBonusMax: scoring?.speedBonusMax ?? 0,
		multiplier: scoring?.multiplier ?? 1,
	};
}

/**
 * A kliens által mért idő, józan határok közé szorítva.
 *
 * Óra nélküli napon nincs mit mérni: nulla. Hiányzó, negatív vagy képtelen
 * érték a teljes időkorlát — aki nem mond időt, az a leglassabb.
 */
export function clampElapsed(
	elapsedSec: unknown,
	timeLimitSec: number
): number {
	if (timeLimitSec <= 0) return 0;

	if (typeof elapsedSec !== 'number' || !Number.isFinite(elapsedSec)) {
		return timeLimitSec;
	}

	return Math.min(Math.max(Math.round(elapsedSec), 0), timeLimitSec + 60);
}

/** Lejárt-e az idő, a hálózat türelmi másodperceivel együtt. */
export function isTimedOut(elapsedSec: number, timeLimitSec: number): boolean {
	return timeLimitSec > 0 && elapsedSec > timeLimitSec + LATE_GRACE_SEC;
}

/**
 * Amit a gyorsaság fizet: csúszó skálán, az azonnali tippnek az egészet, az
 * utolsó másodpercben érkezőnek semmit. Óra nélkül nincs mihez képest
 * gyorsnak lenni, tehát nem fizet.
 */
export function speedBonusFor(
	scoring: QuestionScoring,
	elapsedSec: number,
	timeLimitSec: number
): number {
	if (scoring.speedBonusMax <= 0 || timeLimitSec <= 0) return 0;

	const left = Math.max(timeLimitSec - elapsedSec, 0) / timeLimitSec;

	return Math.round(scoring.speedBonusMax * left);
}

/**
 * Amit a tipp fizet: a nehézség alappontja, mellé a sorozaté és a
 * gyorsaságé, az egész pedig a nap szorzójával. A sorozat első napja még nem
 * bónuszol — a bónusz azért van, hogy a visszatérést díjazza, nem az első
 * kattintást.
 */
export function pointsFor(
	scoring: QuestionScoring,
	streak: number,
	correct: boolean,
	speedBonus = 0
): { points: number; breakdown: AnswerBreakdown } {
	const bonusDays = Math.min(
		Math.max(streak - 1, 0),
		scoring.maxStreakBonusDays
	);
	const breakdown: AnswerBreakdown = {
		base: correct ? scoring.base : 0,
		streakBonus: correct ? bonusDays * scoring.streakBonusPerDay : 0,
		speedBonus: correct ? speedBonus : 0,
		multiplier: scoring.multiplier,
	};

	return {
		points: correct
			? Math.round(
					(breakdown.base +
						breakdown.streakBonus +
						breakdown.speedBonus) *
						scoring.multiplier
				)
			: 0,
		breakdown,
	};
}

/**
 * A kiértékelés maga, Firestore nélkül: a tippből dokumentum és kassza.
 *
 * A lejárt idő úgy viselkedik, mint a rossz tipp: nem fizet, és a sorozatot
 * is elvágja. A megfejtést azért megmondja — az időt húzó gyűjtő is
 * megérdemli, hogy megtudja, mi lett volna a válasz. A találat ténye
 * (`correct`) megmarad, de a kassza `correct` számlálójába csak a határidőn
 * belüli talált tipp számít bele: a találati arány azt mérje, hány kérdést
 * oldott meg, ne azt, hányra tudta volna a választ ráérősen.
 */
export function gradeAnswer(input: {
	day: string;
	optionId: string;
	difficulty: QuestionDifficulty;
	answer: DailyQuestionAnswer;
	score: DailyQuestionScoreDocument;
	answeredAt: number;
	/** A nap pontozása, ahogy a kérdésre írva áll. */
	scoring?: Partial<QuestionScoring> | null;
	/** A nap időkorlátja, másodpercben; 0 = nincs óra. */
	timeLimitSec?: number;
	/** Amennyit a kliens mért. A hívó már szorította józan határok közé. */
	elapsedSec?: number;
}): { answer: DailyAnswerDocument; score: DailyQuestionScoreDocument } {
	const scoring = scoringOf(input.difficulty, input.scoring);
	const timeLimitSec = Math.max(input.timeLimitSec ?? 0, 0);
	const elapsedSec = clampElapsed(input.elapsedSec, timeLimitSec);
	const timedOut = isTimedOut(elapsedSec, timeLimitSec);
	const hit = input.optionId === input.answer.answerId;
	const counts = hit && !timedOut;
	const streak = streakAfter(input.score, input.day, counts);
	const { points, breakdown } = pointsFor(
		scoring,
		streak,
		counts,
		speedBonusFor(scoring, elapsedSec, timeLimitSec)
	);

	return {
		answer: {
			day: input.day,
			optionId: input.optionId,
			answerId: input.answer.answerId,
			correct: hit,
			templateKey: input.answer.templateKey,
			difficulty: input.difficulty,
			subject: input.answer.subject,
			points,
			streak,
			answeredAt: input.answeredAt,
			elapsedSec,
			timedOut,
			breakdown,
		},
		score: {
			points: input.score.points + points,
			streak,
			longestStreak: Math.max(input.score.longestStreak, streak),
			answered: input.score.answered + 1,
			correct: input.score.correct + (counts ? 1 : 0),
			lastDay: input.day,
		},
	};
}

/** A kasszát a hiányzó mezőkkel is olvashatóvá tesszük. */
function readScore(
	snapshot: FirebaseFirestore.DocumentSnapshot
): DailyQuestionScoreDocument {
	if (!snapshot.exists) return EMPTY_SCORE;

	const data = snapshot.data() ?? {};

	return {
		points: (data['points'] as number) ?? 0,
		streak: (data['streak'] as number) ?? 0,
		longestStreak: (data['longestStreak'] as number) ?? 0,
		answered: (data['answered'] as number) ?? 0,
		correct: (data['correct'] as number) ?? 0,
		lastDay: (data['lastDay'] as string | null) ?? null,
	};
}

/**
 * A már megadott tipp — a mezőkből újraolvasva, nem a nyers dokumentumból:
 * az `updatedAt` szervernek szóló bélyege ne kerüljön ki a kliensnek.
 */
function readAnswer(
	snapshot: FirebaseFirestore.DocumentSnapshot,
	day: string
): DailyAnswerDocument {
	const data = snapshot.data() ?? {};

	return {
		day,
		optionId: (data['optionId'] as string) ?? '',
		answerId: (data['answerId'] as string) ?? '',
		correct: !!data['correct'],
		templateKey: (data['templateKey'] as string) ?? '',
		difficulty: (data['difficulty'] as QuestionDifficulty) ?? 'medium',
		subject: data['subject'] as QuestionSubject,
		points: (data['points'] as number) ?? 0,
		streak: (data['streak'] as number) ?? 0,
		answeredAt: (data['answeredAt'] as number) ?? 0,
		elapsedSec: (data['elapsedSec'] as number) ?? 0,
		timedOut: !!data['timedOut'],
		breakdown: (data['breakdown'] as AnswerBreakdown) ?? {
			base: (data['points'] as number) ?? 0,
			streakBonus: 0,
			speedBonus: 0,
			multiplier: 1,
		},
	};
}

/**
 * A nap tippje: kiértékeli, elteszi, és megmondja a megfejtést.
 *
 * Csak a mai kérdésre lehet tippelni. Aki nyitva hagyta a lapot éjfélkor, a
 * tegnapi kérdésre kapna nullát vagy pontot úgy, hogy a mai kérdést közben
 * nem is látta — ezért a nap fordulását inkább hibaként mondjuk meg, a
 * kliens pedig újratölti a kérdést.
 */
export async function answerDailyQuestion(
	database: Firestore,
	uid: string,
	day: string,
	optionId: string,
	now: Date = new Date(),
	/** Ennyi ideig tartott a tipp, a kliens órája szerint. */
	elapsedSec?: number
): Promise<AnswerResult> {
	const today = gameDay(now);

	if (day !== today) {
		throw new DailyAnswerError(
			'stale-day',
			`A nap fordult: ${today} kérdése megy.`
		);
	}

	const question = database.collection(DAILY_QUESTION_COLLECTION).doc(day);
	const secret = question.collection(ANSWER_COLLECTION).doc(ANSWER_DOCUMENT);
	const user = database.collection(USER_COLLECTION).doc(uid);
	const mine = user.collection(DAILY_ANSWER_COLLECTION).doc(day);
	const pot = user
		.collection(GAME_COLLECTION)
		.doc(DAILY_QUESTION_GAME_DOCUMENT);

	return database.runTransaction(async (transaction) => {
		const [questionSnapshot, secretSnapshot, mineSnapshot, potSnapshot] =
			await transaction.getAll(question, secret, mine, pot);

		if (!questionSnapshot.exists || !secretSnapshot.exists) {
			throw new DailyAnswerError('no-question', 'Ma nincs kérdés.');
		}

		const score = readScore(potSnapshot);

		if (mineSnapshot.exists) {
			return {
				answer: readAnswer(mineSnapshot, day),
				score,
				graded: false,
			};
		}

		const options = (questionSnapshot.get('options') ??
			[]) as QuestionOption[];

		if (!options.some((option) => option.id === optionId)) {
			throw new DailyAnswerError(
				'unknown-option',
				'Nincs ilyen válaszlehetőség.'
			);
		}

		const result = gradeAnswer({
			day,
			optionId,
			difficulty:
				(questionSnapshot.get('difficulty') as QuestionDifficulty) ??
				'medium',
			answer: secretSnapshot.data() as DailyQuestionAnswer,
			score,
			answeredAt: now.getTime(),
			scoring: questionSnapshot.get('scoring') as
				Partial<QuestionScoring> | undefined,
			timeLimitSec:
				(questionSnapshot.get('timeLimitSec') as number | undefined) ??
				0,
			elapsedSec,
		});

		transaction.set(mine, stamp(result.answer));
		transaction.set(pot, stamp(result.score));

		return { ...result, graded: true };
	});
}
