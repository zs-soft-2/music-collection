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

/** Amit egy jó tipp fizet, nehézség szerint. */
export const POINTS: Record<QuestionDifficulty, number> = {
	easy: 10,
	medium: 20,
	hard: 30,
};

/** A sorozat naponta ennyit tesz a jó tipp mellé… */
export const STREAK_BONUS_PER_DAY = 2;
/** …de legföljebb ennyi napig; a hatodik naptól a bónusz nem nő tovább. */
export const MAX_STREAK_BONUS_DAYS = 5;

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
 * Amit a tipp fizet: a nehézség alappontja, mellé a sorozat bónusza. A
 * sorozat első napja még nem bónuszol — a bónusz azért van, hogy a
 * visszatérést díjazza, nem az első kattintást.
 */
export function pointsFor(
	difficulty: QuestionDifficulty,
	streak: number,
	correct: boolean
): number {
	if (!correct) return 0;

	const base = POINTS[difficulty] ?? POINTS.medium;
	const bonusDays = Math.min(Math.max(streak - 1, 0), MAX_STREAK_BONUS_DAYS);

	return base + bonusDays * STREAK_BONUS_PER_DAY;
}

/** A kiértékelés maga, Firestore nélkül: a tippből dokumentum és kassza. */
export function gradeAnswer(input: {
	day: string;
	optionId: string;
	difficulty: QuestionDifficulty;
	answer: DailyQuestionAnswer;
	score: DailyQuestionScoreDocument;
	answeredAt: number;
}): { answer: DailyAnswerDocument; score: DailyQuestionScoreDocument } {
	const correct = input.optionId === input.answer.answerId;
	const streak = streakAfter(input.score, input.day, correct);
	const points = pointsFor(input.difficulty, streak, correct);

	return {
		answer: {
			day: input.day,
			optionId: input.optionId,
			answerId: input.answer.answerId,
			correct,
			templateKey: input.answer.templateKey,
			difficulty: input.difficulty,
			subject: input.answer.subject,
			points,
			streak,
			answeredAt: input.answeredAt,
		},
		score: {
			points: input.score.points + points,
			streak,
			longestStreak: Math.max(input.score.longestStreak, streak),
			answered: input.score.answered + 1,
			correct: input.score.correct + (correct ? 1 : 0),
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
	now: Date = new Date()
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
		});

		transaction.set(mine, stamp(result.answer));
		transaction.set(pot, stamp(result.score));

		return { ...result, graded: true };
	});
}
