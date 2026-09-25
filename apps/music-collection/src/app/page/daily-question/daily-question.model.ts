import { DailyQuestionDifficulty } from '@music-collection/api';

/**
 * The question as a sentence: which frame to put it in, and the catalog
 * values that go in the frame's slots. The values are never translated —
 * an album is called what it is called.
 */
export interface QuestionFrame {
	/** Full i18n key, `dailyQuestion.template.<key>`. */
	key: string;
	params: Record<string, string>;
}

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
}

/** i18n key of a difficulty's name. */
export const DIFFICULTY_KEY_PREFIX = 'page.daily-question.difficulty.';
