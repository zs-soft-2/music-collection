import {
	DailyQuestionLeaderboard,
	DailyQuestionSettings,
} from '@music-collection/api';

/**
 * Names and defaults the daily question needs, kept here rather than in
 * `libs/api`.
 *
 * The reason is the bundle, not taste: everything exported as a *value* from
 * the library's barrel is re-exported through it, and the glue for that
 * lands in the main bundle whether or not anybody outside a lazy page uses
 * it. The types stay in the library, where they are shared with the server's
 * shape; these constants belong to the game's own page and its admin page,
 * both of which are loaded lazily.
 */

/** The leaderboards, one document per game: `leaderboard/{gameId}`. */
export const LEADERBOARD_FEATURE_KEY = 'leaderboard';
/** The daily question's leaderboard among them. */
export const DAILY_QUESTION_LEADERBOARD_DOCUMENT = 'daily-question';

/** Callable name of the settings read; admin only. */
export const READ_DAILY_QUESTION_SETTINGS_FUNCTION =
	'readDailyQuestionSettings';
/** Callable name of the settings write; admin only. */
export const UPDATE_DAILY_QUESTION_SETTINGS_FUNCTION =
	'updateDailyQuestionSettings';
/** Callable name of the by-hand composing; admin only. */
export const COMPOSE_DAILY_QUESTION_NOW_FUNCTION = 'composeDailyQuestionNow';
/** Callable name of the by-hand leaderboard rebuild; admin only. */
export const REFRESH_DAILY_QUESTION_LEADERBOARD_FUNCTION =
	'refreshDailyQuestionLeaderboardNow';

/**
 * What the game falls back to before an admin has said otherwise. The server
 * keeps the same defaults (`apps/functions/src/daily-question-settings.ts`);
 * this copy is what the admin form shows until the real ones arrive.
 */
export const DEFAULT_DAILY_QUESTION_SETTINGS: DailyQuestionSettings = {
	enabled: true,
	timeLimitSec: 60,
	points: { easy: 10, medium: 20, hard: 30 },
	streakBonusPerDay: 2,
	maxStreakBonusDays: 5,
	speedBonusMax: 10,
	bonusDayChance: 0.15,
	bonusDayMultiplier: 2,
	disabledTemplates: [],
	leaderboardSize: 20,
};

/** No field yet: nobody has played, or no run has built one. */
export const EMPTY_DAILY_QUESTION_LEADERBOARD: DailyQuestionLeaderboard = {
	rows: [],
	players: 0,
	updatedAt: 0,
};
