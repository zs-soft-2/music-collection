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
 *
 * The day's own rules travel with the question — the time limit and the
 * multiplier are written into it when it is composed. An admin who changes
 * the settings at noon changes tomorrow's game, not the one already being
 * played.
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
	/**
	 * Seconds to answer in, 0 when the day has no limit. Absent on questions
	 * composed before the game had a clock.
	 */
	timeLimitSec?: number;
	/** What the day pays. Absent on questions composed before it existed. */
	scoring?: DailyQuestionScoring;
	/** A picture the question is about (an album cover), when it has one. */
	imageUrl?: string | null;
}

/**
 * What the day pays, decided when the question was composed and carried with
 * it.
 *
 * It travels with the question rather than being read from the settings at
 * grading time, for two reasons: an admin who raises the points at noon does
 * not make the morning's guesses worth less than the afternoon's, and the
 * grading transaction stays the size it was.
 */
export interface DailyQuestionScoring {
	/** What the difficulty pays for a right guess. */
	base: number;
	streakBonusPerDay: number;
	maxStreakBonusDays: number;
	/** The most an early guess can add; 0 without a time limit. */
	speedBonusMax: number;
	/** 1 normally, more on a bonus day. */
	multiplier: number;
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
	kind: 'album' | 'artist' | 'release' | 'track' | 'musician';
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
	/** How long the guess took, in seconds; 0 on a day without a clock. */
	elapsedSec?: number;
	/** The guess came after the time ran out: right or not, it paid nothing. */
	timedOut?: boolean;
	/** Where the points came from, for the line that explains the score. */
	breakdown?: DailyAnswerBreakdown;
}

/**
 * What the points are made of. Shown after the guess, because a number that
 * cannot be accounted for is not a reward — the collector should see that
 * the streak and the speed did something.
 */
export interface DailyAnswerBreakdown {
	/** What the difficulty pays. */
	base: number;
	/** What the run of days added. */
	streakBonus: number;
	/** What answering early added. */
	speedBonus: number;
	/** The day's multiplier — above 1 on a bonus day. */
	multiplier: number;
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
	/**
	 * Place in the field, as the last leaderboard run saw it; null before
	 * one has seen this collector. Written by
	 * `refreshDailyQuestionLeaderboard`, never by the grading — a place is a
	 * statement about everybody, and only that run reads everybody.
	 */
	rank?: number | null;
	/** How many collectors the place is out of. */
	players?: number | null;
}

/** No pot yet: nothing guessed, nothing owed. */
export const EMPTY_DAILY_QUESTION_SCORE: DailyQuestionScore = {
	points: 0,
	streak: 0,
	longestStreak: 0,
	answered: 0,
	correct: 0,
	lastDay: null,
	rank: null,
	players: null,
};

/**
 * What an admin may change about the game: `app-setting/daily-question`.
 *
 * Read and written through callables only — the same shape lives in
 * `apps/functions/src/daily-question-settings.ts`, because the functions
 * build cannot see the libraries. The two have to say the same thing.
 */
export interface DailyQuestionSettings {
	/** Switched off, no question is composed and the page says so. */
	enabled: boolean;
	/** Seconds to answer in; 0 takes the clock off. */
	timeLimitSec: number;
	/** What a right guess pays, by difficulty. */
	points: Record<DailyQuestionDifficulty, number>;
	/** What each day of an unbroken run adds… */
	streakBonusPerDay: number;
	/** …and how many days of it are paid for. */
	maxStreakBonusDays: number;
	/**
	 * The most a fast guess can add. It is paid on a sliding scale: all of
	 * it for an instant answer, nothing for one that used up the clock.
	 * Needs a time limit — without a clock there is no speed to measure.
	 */
	speedBonusMax: number;
	/** How often a day pays double (0–1), drawn from the day itself. */
	bonusDayChance: number;
	/** What a bonus day multiplies the points by. */
	bonusDayMultiplier: number;
	/** Template keys that may not be drawn. Everything else may. */
	disabledTemplates: string[];
	/** How many places the leaderboard shows. */
	leaderboardSize: number;
}

/** One question kind, as the server reports it to the admin page. */
export interface DailyQuestionTemplateInfo {
	/** i18n key of the frame, and what `disabledTemplates` names. */
	key: string;
	difficulty: DailyQuestionDifficulty;
}

/**
 * The settings, and what there is to switch on and off.
 *
 * The template list comes from the server rather than from a copy kept here:
 * the engine is what knows the kinds of question, and a list that drifts
 * would let an admin switch off a template nobody draws.
 */
export interface DailyQuestionSettingsView {
	settings: DailyQuestionSettings;
	templates: DailyQuestionTemplateInfo[];
}

/**
 * The field, rebuilt once a day: `leaderboard/daily-question`.
 *
 * One document, not a query. A live leaderboard read from the clients would
 * cost a query per visitor and get worse as the field grows; this way every
 * visitor reads one document, and the run that builds it is the only thing
 * that reads everybody.
 */
export interface DailyQuestionLeaderboard {
	/** The top places, best first. */
	rows: DailyQuestionLeaderboardRow[];
	/** How many collectors have played at all. */
	players: number;
	/** When the run last rebuilt this, epoch milliseconds. */
	updatedAt: number;
}

export interface DailyQuestionLeaderboardRow {
	/** 1-based place; ties share a place. */
	rank: number;
	uid: string;
	/** The collector's display name, or an empty string when they have none. */
	name: string;
	points: number;
	streak: number;
	longestStreak: number;
	answered: number;
	correct: number;
}

/**
 * Callable name of the grading (apps/functions).
 *
 * The game's other callables — the settings, the by-hand composing, the
 * leaderboard rebuild — are named in the app's own data layer rather than
 * here. Every value exported from this library reaches the main bundle
 * through the barrel's re-exports, and names only the daily question's lazy
 * page and its admin page ever use have no business travelling there.
 */
export const ANSWER_DAILY_QUESTION_FUNCTION = 'answerDailyQuestion';

export interface AnswerDailyQuestionInput {
	/** The day being answered; the server refuses anything but today's. */
	day: string;
	optionId: string;
	/**
	 * How long the guess took, in seconds, as the page's clock measured it.
	 *
	 * The client is trusted with this on purpose: the alternative is a
	 * second write a day per player to open the round on the server, and the
	 * game is a game. The server still clamps it — a missing or impossible
	 * value counts as the full time limit, so lying about it cannot pay more
	 * than answering instantly honestly would.
	 */
	elapsedSec?: number;
}

export interface AnswerDailyQuestionResult {
	answer: DailyAnswer;
	score: DailyQuestionScore;
	/** False when the day had a guess already: this one was not counted. */
	graded: boolean;
}

/** What the by-hand composing reports back to the admin page. */
export interface ComposeDailyQuestionResult {
	day: string;
	created: boolean;
	templateKey: string | null;
	difficulty: DailyQuestionDifficulty | null;
	/** How many albums had to be drawn before one made a question. */
	tries: number;
	/** Why it went the way it did; the admin page says it out loud. */
	reason: 'created' | 'exists' | 'disabled' | 'no-material';
	/** What the day pays times this — above 1 on a bonus day. */
	multiplier: number;
}

/** What the by-hand leaderboard rebuild reports back. */
export interface RefreshLeaderboardResult {
	players: number;
	/** How many pots the run wrote a place into. */
	ranked: number;
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
