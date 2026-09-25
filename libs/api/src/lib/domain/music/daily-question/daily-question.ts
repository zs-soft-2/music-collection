import { Entity } from '../../../common';

/**
 * The question of the day: one question for everybody, drawn out of the
 * catalog. Document: `daily-question/{day}`, the day being its id.
 *
 * Written only by `composeDailyQuestionDaily` (Cloud Functions), a few
 * minutes after midnight in `DAILY_QUESTION_TIME_ZONE`. Nothing is ever
 * written here from the client.
 *
 * **The answer is not in it.** It sits in a subcollection the rules open to
 * nobody, because with four options hashing the answer would only mean
 * trying all four. A guess is therefore graded by the
 * `answerDailyQuestion` callable, which is also the only way to learn
 * whether it was right.
 */
export interface DailyQuestion {
	/** The day the question belongs to, `YYYY-MM-DD`; also the document id. */
	day: string;
	/** i18n key of the question's frame: `dailyQuestion.template.<key>`. */
	templateKey: string;
	difficulty: DailyQuestionDifficulty;
	/** Catalog values for the frame's placeholders — album, artist, year… */
	params: Record<string, string>;
	options: DailyQuestionOption[];
}

export type DailyQuestionEntity = DailyQuestion & Entity;

/** Gets harder as the week goes on, like a crossword. */
export type DailyQuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface DailyQuestionOption {
	/** Stable within the day; this is what the guess names. */
	id: string;
	/** A finished catalog value (a name, a year): never translated. */
	label: string;
}

/** What the question was about, for the link that follows the reveal. */
export interface DailyQuestionSubject {
	kind: 'album' | 'artist' | 'release' | 'track';
	uid: string;
	name: string;
}

/**
 * The collector's guess for one day, as the grading callable writes it:
 * `user/{uid}/daily-answer/{day}`. The right answer is in it — once the
 * guess is in, there is nothing left to hide. The rules let the collector
 * read their own and nobody write any.
 */
export interface DailyAnswer {
	day: string;
	/** What the collector picked. */
	optionId: string;
	/** Which option was right. */
	answerId: string;
	correct: boolean;
	templateKey: string;
	difficulty: DailyQuestionDifficulty;
	subject: DailyQuestionSubject;
	points: number;
	/** The run of days this guess left behind; a wrong guess ends it. */
	streak: number;
	/** Epoch milliseconds. */
	answeredAt: number;
}

/**
 * The game's own pot: `user/{uid}/game/daily-question`.
 *
 * Game points are deliberately not collection points — a collection pays
 * nothing until it is complete, and a quiz trickling into the same pot would
 * take the meaning out of that rule.
 */
export interface DailyQuestionScore {
	points: number;
	/** Days answered correctly in a row, as of `lastDay`. */
	streak: number;
	longestStreak: number;
	answered: number;
	correct: number;
	/** The last day guessed at, `YYYY-MM-DD`; null before the first one. */
	lastDay: string | null;
}

/** No pot yet: nothing guessed, nothing owed. */
export const EMPTY_DAILY_QUESTION_SCORE: DailyQuestionScore = {
	points: 0,
	streak: 0,
	longestStreak: 0,
	answered: 0,
	correct: 0,
	lastDay: null,
};

/** Callable name of the grading (apps/functions). */
export const ANSWER_DAILY_QUESTION_FUNCTION = 'answerDailyQuestion';

export interface AnswerDailyQuestionInput {
	/** The day being answered; the server refuses anything but today's. */
	day: string;
	optionId: string;
}

export interface AnswerDailyQuestionResult {
	answer: DailyAnswer;
	score: DailyQuestionScore;
	/** False when the day had a guess already: this one was not counted. */
	graded: boolean;
}

/**
 * The day of the game turns over in this zone — the one the composing
 * schedule runs in. The client has to agree with the server about which day
 * it is, or it would ask for a question that does not exist.
 *
 * The server keeps its own copy of this (`GAME_TIME_ZONE` in
 * `apps/functions/src/daily-question.ts`): the functions build cannot see the
 * libraries. The two have to say the same thing.
 */
export const DAILY_QUESTION_TIME_ZONE = 'Europe/Budapest';

/** Today's question day, `YYYY-MM-DD`, in the game's own zone. */
export function dailyQuestionDay(
	now: Date = new Date(),
	timeZone: string = DAILY_QUESTION_TIME_ZONE
): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const value = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? '';

	return `${value('year')}-${value('month')}-${value('day')}`;
}
