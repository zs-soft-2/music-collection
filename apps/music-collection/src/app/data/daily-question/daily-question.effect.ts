import { Observable, catchError, map, throwError } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AnswerDailyQuestionResult,
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionScore,
	EMPTY_DAILY_QUESTION_SCORE,
	dailyQuestionDay,
} from '@music-collection/api';

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

	public question$(day: string): Observable<DailyQuestionEntity | null> {
		return this.repository.question$(day);
	}

	public answer$(day: string): Observable<DailyAnswer | null> {
		return this.repository.answer$(day);
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
	 * One guess for the day. A day already answered is not graded again: the
	 * server hands back the first guess, `graded` false.
	 */
	public submit$(
		day: string,
		optionId: string
	): Observable<AnswerDailyQuestionResult> {
		return this.repository
			.grade$({ day, optionId })
			.pipe(
				catchError((error) =>
					throwError(
						() => new DailyAnswerRejected(toAnswerFailure(error))
					)
				)
			);
	}
}
