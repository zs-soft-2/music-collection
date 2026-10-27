import {
	Observable,
	catchError,
	combineLatest,
	map,
	of,
	startWith,
	throwError,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AnswerDailyQuestionResult,
	ComposeDailyQuestionResult,
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionLeaderboard,
	DailyQuestionScore,
	DailyQuestionSettings,
	DailyQuestionSettingsView,
	EMPTY_DAILY_QUESTION_SCORE,
	RefreshLeaderboardResult,
	dailyQuestionDay,
} from '@music-collection/api';

import { EMPTY_DAILY_QUESTION_LEADERBOARD } from './daily-question.constants';
import { DailyQuestionRepository } from './daily-question.repository';

/**
 * Why a guess could not be graded. The reasons are told apart because the
 * page does something different with each: a turned day is reloaded, a
 * missing question is simply said out loud, and the rest is an apology.
 */
export type DailyAnswerFailure =
	/** The day turned while the page was open; the question is a new one. */
	| 'stale-day'
	/** No question was composed for the day at all. */
	| 'no-question'
	/** The session is gone — signed out in another tab, say. */
	| 'signed-out'
	| 'unknown';

/** Firebase prefixes a callable's error code with the product. */
const FAILURES: Record<string, DailyAnswerFailure> = {
	'functions/failed-precondition': 'stale-day',
	'functions/not-found': 'no-question',
	'functions/unauthenticated': 'signed-out',
};

/** What the grading callable's error means for the page. */
export function toAnswerFailure(error: unknown): DailyAnswerFailure {
	const code = (error as { code?: unknown } | null)?.code;

	return (typeof code === 'string' && FAILURES[code]) || 'unknown';
}

/**
 * The days behind the collector: what was asked, and what they guessed.
 *
 * The two lists are kept side by side rather than merged here — which day
 * lines up with which guess is a question about the view, and the view is
 * where it is answered.
 */
export interface DailyQuestionHistory {
	questions: DailyQuestionEntity[];
	/** Only the days the collector played; the rest they skipped. */
	answers: DailyAnswer[];
}

/** Raised for the store; carries the reason rather than the wire error. */
export class DailyAnswerRejected extends Error {
	constructor(public readonly failure: DailyAnswerFailure) {
		super(failure);
		this.name = 'DailyAnswerRejected';
	}
}

/**
 * The daily question as the page needs it: today's question, the collector's
 * own guess, the pot, and the grading of a guess.
 *
 * The day is decided here rather than by the page, and in the game's own zone
 * — the one the composing schedule runs in. A browser in another zone would
 * otherwise ask for a day the server has not composed yet.
 */
@Injectable({ providedIn: 'root' })
export class DailyQuestionEffect {
	private readonly repository = inject(DailyQuestionRepository);

	/** Today, as the game counts days. */
	public today(now: Date = new Date()): string {
		return dailyQuestionDay(now);
	}

	/**
	 * When the round started, as this browser remembers it — and the moment
	 * itself when it is the first time the day's question is shown here.
	 *
	 * The clock is the client's: the grading takes the seconds the page
	 * measured. Remembering the start means a reload does not hand out a
	 * fresh minute.
	 */
	public startedAt(day: string, now: number = Date.now()): number {
		const remembered = this.repository.startedAt(day);

		if (remembered) return remembered;

		this.repository.rememberStart(day, now);

		return now;
	}

	/** Who is playing — the leaderboard marks their own row with it. */
	public uid$(): Observable<string | null> {
		return this.repository.uid$();
	}

	public question$(day: string): Observable<DailyQuestionEntity | null> {
		return this.repository.question$(day);
	}

	public answer$(day: string): Observable<DailyAnswer | null> {
		return this.repository.answer$(day);
	}

	/**
	 * The questions of the last days, newest first — the admin's list of what
	 * the game has been asking.
	 *
	 * The public documents carry no answer, so this says what was asked and
	 * nothing about who got it right.
	 */
	public questionHistory$(days: number): Observable<DailyQuestionEntity[]> {
		return this.repository.history$(days);
	}

	/**
	 * The same days with the collector's own guesses beside them.
	 *
	 * Read on demand rather than with the page: a collector who never opens
	 * their history pays nothing for it, and the days that are over do not
	 * change while they are being read.
	 */
	public playHistory$(days: number): Observable<DailyQuestionHistory> {
		return combineLatest([
			this.repository.history$(days),
			this.repository.answerHistory$(days),
		]).pipe(map(([questions, answers]) => ({ questions, answers })));
	}

	/**
	 * The reminder for the day was sent away in this browser. Asked once, at
	 * the moment the banner would go up.
	 */
	public isDismissed(day: string): boolean {
		return this.repository.isDismissed(day);
	}

	/** Sends the day's reminder away until the day turns. */
	public dismiss(day: string): void {
		this.repository.dismiss(day);
	}

	/**
	 * The pot. A collector who has never guessed has no document; that is an
	 * empty pot rather than a missing one, so the page is spared the null.
	 */
	public score$(): Observable<DailyQuestionScore> {
		return this.repository
			.score$()
			.pipe(map((score) => score ?? EMPTY_DAILY_QUESTION_SCORE));
	}

	/**
	 * The field. A page that cannot read it — signed out, offline, or simply
	 * no run yet — shows an empty table rather than nothing at all, so the
	 * leaderboard never takes the question down with it.
	 */
	public leaderboard$(): Observable<DailyQuestionLeaderboard> {
		return this.repository.leaderboard$().pipe(
			map(
				(leaderboard) => leaderboard ?? EMPTY_DAILY_QUESTION_LEADERBOARD
			),
			catchError((error) => {
				console.warn('A ranglista nem olvasható', error);

				return of(EMPTY_DAILY_QUESTION_LEADERBOARD);
			}),
			startWith(EMPTY_DAILY_QUESTION_LEADERBOARD)
		);
	}

	/**
	 * One guess for the day, with the seconds the page's clock measured.
	 *
	 * A day already answered is not graded again: the server hands back the
	 * first guess, `graded` false.
	 */
	public submit$(
		day: string,
		optionId: string,
		elapsedSec?: number
	): Observable<AnswerDailyQuestionResult> {
		return this.repository
			.grade$({ day, optionId, elapsedSec })
			.pipe(
				catchError((error) =>
					throwError(
						() => new DailyAnswerRejected(toAnswerFailure(error))
					)
				)
			);
	}

	// ── Admin ───────────────────────────────────────────────────────────────

	/** The game's settings and the kinds of question there are. */
	public settings$(): Observable<DailyQuestionSettingsView> {
		return this.repository.readSettings$();
	}

	public saveSettings$(
		settings: DailyQuestionSettings
	): Observable<DailyQuestionSettingsView> {
		return this.repository.updateSettings$(settings);
	}

	/** Composes a day's question by hand; `force` replaces one already up. */
	public compose$(
		day?: string,
		force = false
	): Observable<ComposeDailyQuestionResult> {
		return this.repository.compose$({ day, force });
	}

	/** Rebuilds the field without waiting for the nightly run. */
	public refreshLeaderboard$(): Observable<RefreshLeaderboardResult> {
		return this.repository.refreshLeaderboard$();
	}
}
