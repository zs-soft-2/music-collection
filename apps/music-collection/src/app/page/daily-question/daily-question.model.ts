import { DailyQuestionDifficulty } from '@music-collection/api';

import { QuestionFrame } from '../../shared/daily-question';

/** One of the four buttons. */
export interface DailyQuestionOptionView {
	id: string;
	label: string;
	/** What the collector picked — their pick before the guess, theirs after. */
	picked: boolean;
	/** The right one; only ever true once the guess is in. */
	correct: boolean;
	/** Their pick, and it was wrong: the one option the reveal crosses out. */
	missed: boolean;
}

/** What the page shows of today's question. */
export interface DailyQuestionView {
	day: string;
	difficulty: DailyQuestionDifficulty;
	frame: QuestionFrame;
	options: DailyQuestionOptionView[];
	/** Seconds to answer in; 0 on a day without a clock. */
	timeLimitSec: number;
	/** What the day pays times this; above 1 on a bonus day. */
	multiplier: number;
	/** The picture the question is about (a cover), when it has one. */
	imageUrl: string | null;
}

/** i18n key of a difficulty's name. */
export const DIFFICULTY_KEY_PREFIX = 'page.daily-question.difficulty.';

/** One place in the field. */
export interface LeaderboardRowView {
	rank: number;
	/** Empty when the collector has no display name; the page says so. */
	name: string;
	points: number;
	streak: number;
	longestStreak: number;
	answered: number;
	correct: number;
	/** Rounded percentage of guesses that landed. */
	accuracy: number;
	/** This row is the collector reading it. */
	isMe: boolean;
}

/**
 * The table: the top of the field, and the reader's own place.
 *
 * `me` is filled only when the reader is not among the rows — a collector in
 * the twenties should still see where they stand, without the document
 * carrying the whole field.
 */
export interface LeaderboardView {
	rows: LeaderboardRowView[];
	/** Everybody who has played, not just the rows shown. */
	players: number;
	/** When the run last rebuilt the field; 0 before the first one. */
	updatedAt: number;
	me: LeaderboardRowView | null;
}

export const EMPTY_LEADERBOARD_VIEW: LeaderboardView = {
	rows: [],
	players: 0,
	updatedAt: 0,
	me: null,
};

/**
 * One day behind the collector.
 *
 * A day they did not play carries the question and nothing else: the answer
 * of a day that is over cannot be learned any more — the grading only ever
 * takes today's guess — so the row says they skipped it rather than pretending
 * to reveal something.
 */
export interface HistoryRowView {
	day: string;
	difficulty: DailyQuestionDifficulty;
	frame: QuestionFrame;
	/** They guessed on the day at all. */
	played: boolean;
	correct: boolean;
	/** The right option, as it read; empty on a day they skipped. */
	answerLabel: string;
	/** What they picked, when it was not the right one. */
	pickedLabel: string;
	points: number;
	/** The guess came in after the clock ran out, and paid nothing. */
	late: boolean;
}
