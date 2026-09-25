import {
	combineLatest,
	filter,
	interval,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionLeaderboard,
	DailyQuestionScore,
	EMPTY_DAILY_QUESTION_SCORE,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import {
	DailyAnswerFailure,
	DailyAnswerRejected,
	DailyQuestionEffect,
	DailyQuestionHistory,
	EMPTY_DAILY_QUESTION_LEADERBOARD,
} from '../../data/daily-question';

import {
	toHistoryRows,
	toLeaderboardView,
	toSubjectLink,
	toView,
} from './daily-question.mapper';
import { HistoryRowView } from './daily-question.model';

interface DailyQuestionPageState {
	/** The day being played, `YYYY-MM-DD`; the effect decides which. */
	day: string;
	isLoading: boolean;
	question: DailyQuestionEntity | null;
	/** The guess, once made; this is also what reveals the answer. */
	answer: DailyAnswer | null;
	score: DailyQuestionScore;
	leaderboard: DailyQuestionLeaderboard;
	/** Who is playing; the leaderboard marks their row. */
	uid: string | null;
	/** Picked but not sent yet — a guess is only spent when it is sent. */
	selectedOptionId: string | null;
	isSubmitting: boolean;
	failure: DailyAnswerFailure | null;
	/**
	 * When the clock started, epoch milliseconds: the moment the question
	 * appeared on this page. Null on a day without a limit, and once the
	 * guess is in.
	 */
	startedAt: number | null;
	/** Moved by the ticker; the countdown is computed from it. */
	nowMs: number;
	/** The days behind, once the collector has asked to see them. */
	history: HistoryRowView[];
	isHistoryOpen: boolean;
	isHistoryLoading: boolean;
	/** Read once per visit: a day that is over does not change under it. */
	isHistoryLoaded: boolean;
}

/**
 * How far back the history goes. Two weeks is what a streak is measured in,
 * and every day of it is a document read — so the list stops where looking
 * back stops being interesting.
 */
export const HISTORY_DAYS = 14;

const initialState: DailyQuestionPageState = {
	day: '',
	isLoading: true,
	question: null,
	answer: null,
	score: EMPTY_DAILY_QUESTION_SCORE,
	leaderboard: EMPTY_DAILY_QUESTION_LEADERBOARD,
	uid: null,
	selectedOptionId: null,
	isSubmitting: false,
	failure: null,
	startedAt: null,
	nowMs: 0,
	history: [],
	isHistoryOpen: false,
	isHistoryLoading: false,
	isHistoryLoaded: false,
};

export const DailyQuestionPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		/** Seconds gone since the question appeared here. */
		const elapsedSec = computed(() => {
			const startedAt = store.startedAt();

			if (!startedAt) return 0;

			return Math.max(Math.floor((store.nowMs() - startedAt) / 1000), 0);
		});
		const timeLimitSec = computed(() =>
			Math.max(store.question()?.timeLimitSec ?? 0, 0)
		);
		/** The table, built once and read by both the list and its guard. */
		const leaderboardView = computed(() =>
			toLeaderboardView(store.leaderboard(), store.score(), store.uid())
		);

		return {
			/** The question as a sentence and four buttons. */
			view: computed(() => {
				const question = store.question();

				return question
					? toView(question, store.answer(), store.selectedOptionId())
					: null;
			}),
			isAnswered: computed(() => !!store.answer()),
			isCorrect: computed(() => !!store.answer()?.correct),
			/** The day has no question: the composing found no material, or has not run. */
			hasNoQuestion: computed(
				() => !store.isLoading() && !store.question()
			),
			elapsedSec,
			timeLimitSec,
			/** Whether the day is played against a clock at all. */
			hasClock: computed(() => timeLimitSec() > 0),
			/** Seconds left; 0 once the time is up. */
			remainingSec: computed(() =>
				Math.max(timeLimitSec() - elapsedSec(), 0)
			),
			/**
			 * The time ran out before the guess went in. The guess is still
			 * allowed — the server takes it, marks it late and pays nothing —
			 * because knowing the answer is worth more than the points.
			 */
			isExpired: computed(
				() =>
					timeLimitSec() > 0 &&
					!store.answer() &&
					elapsedSec() >= timeLimitSec()
			),
			/** How much of the clock is gone, for the bar. */
			clockPercent: computed(() =>
				timeLimitSec()
					? Math.min(
							Math.round((elapsedSec() / timeLimitSec()) * 100),
							100
						)
					: 0
			),
			/** Today pays more than usual, and the page says so. */
			isBonusDay: computed(
				() => (store.question()?.scoring?.multiplier ?? 1) > 1
			),
			multiplier: computed(
				() => store.question()?.scoring?.multiplier ?? 1
			),
			/** The guess is late: it was graded, but paid nothing. */
			wasLate: computed(() => !!store.answer()?.timedOut),
			breakdown: computed(() => store.answer()?.breakdown ?? null),
			canSubmit: computed(
				() =>
					!!store.selectedOptionId() &&
					!store.answer() &&
					!store.isSubmitting()
			),
			/** Where the reveal leads — the album, artist or pressing behind it. */
			subjectLink: computed(() => toSubjectLink(store.answer()?.subject)),
			subjectName: computed(() => store.answer()?.subject?.name ?? ''),
			/** The pot is worth showing once there is something in it. */
			hasPot: computed(() => store.score().answered > 0),
			accuracy: computed(() => {
				const score = store.score();

				return score.answered
					? Math.round((score.correct / score.answered) * 100)
					: 0;
			}),
			/** The collector's own place, as the last run saw it. */
			rank: computed(() => store.score().rank ?? null),
			/** The table: the top of the field and the reader's own row. */
			leaderboardView,
			/** Nothing to show until somebody has played. */
			hasLeaderboard: computed(
				() => !!leaderboardView().rows.length || !!leaderboardView().me
			),
			/** The list is worth showing once a day has gone by. */
			hasHistory: computed(() => !!store.history().length),
			/** Days guessed at, out of the days listed. */
			historyPlayed: computed(
				() => store.history().filter((row) => row.played).length
			),
		};
	}),
	withMethods((store, effect = inject(DailyQuestionEffect)) => {
		const loadQuestion = rxMethod<string>(
			pipe(
				switchMap((day) =>
					effect.question$(day).pipe(
						tapResponse({
							next: (question: DailyQuestionEntity | null) =>
								patchState(store, {
									question,
									isLoading: false,
									// The clock starts when the question
									// first appears in this browser — and a
									// reload does not restart it.
									startedAt:
										question && !store.answer()
											? effect.startedAt(day)
											: null,
									nowMs: Date.now(),
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { isLoading: false });
							},
						})
					)
				)
			)
		);

		/**
		 * The collector's own guess, followed rather than fetched: the
		 * grading writes it on the server, and a second tab playing the same
		 * day should see the reveal too.
		 */
		const followAnswer = rxMethod<string>(
			pipe(
				switchMap((day) =>
					effect.answer$(day).pipe(
						tapResponse({
							next: (answer: DailyAnswer | null) =>
								patchState(store, {
									answer,
									// An answered day has no clock left to run.
									startedAt: answer
										? null
										: store.startedAt(),
								}),
							error: (error) => console.error(error),
						})
					)
				)
			)
		);

		const followScore = rxMethod<void>(
			pipe(
				switchMap(() =>
					effect.score$().pipe(
						tapResponse({
							next: (score: DailyQuestionScore) =>
								patchState(store, { score }),
							error: (error) => console.error(error),
						})
					)
				)
			)
		);

		/** The field, and who is reading it. */
		const followLeaderboard = rxMethod<void>(
			pipe(
				switchMap(() =>
					combineLatest([effect.leaderboard$(), effect.uid$()]).pipe(
						tapResponse({
							next: ([leaderboard, uid]) =>
								patchState(store, { leaderboard, uid }),
							error: (error) => console.error(error),
						})
					)
				)
			)
		);

		/**
		 * The countdown, a second at a time. It only writes while a clock is
		 * actually running, so an answered question — or a day without a
		 * limit — costs the page nothing.
		 */
		const tick = rxMethod<void>(
			pipe(
				switchMap(() => interval(1000)),
				filter(
					() =>
						!!store.startedAt() &&
						!store.answer() &&
						(store.question()?.timeLimitSec ?? 0) > 0
				),
				tap(() => patchState(store, { nowMs: Date.now() }))
			)
		);

		/**
		 * The days behind, read once and only when they are asked for.
		 *
		 * A collector who never opens the list pays for none of it; the days
		 * that are over do not change while it is open, so one read is all it
		 * ever takes.
		 */
		const loadHistory = rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isHistoryLoading: true })),
				switchMap(() =>
					effect.playHistory$(HISTORY_DAYS).pipe(
						tapResponse({
							next: (history: DailyQuestionHistory) =>
								patchState(store, {
									history: toHistoryRows(
										history.questions,
										history.answers,
										effect.today()
									),
									isHistoryLoading: false,
									isHistoryLoaded: true,
								}),
							error: (error) => {
								console.error(error);
								// A list that cannot be read stays closed
								// rather than empty: the next open tries again.
								patchState(store, {
									isHistoryLoading: false,
									isHistoryOpen: false,
								});
							},
						})
					)
				)
			)
		);

		/** Opens a day: the question, and whatever was guessed on it. */
		const open = (day: string): void => {
			patchState(store, {
				day,
				isLoading: true,
				question: null,
				answer: null,
				selectedOptionId: null,
				isSubmitting: false,
				failure: null,
				startedAt: null,
				nowMs: Date.now(),
			});
			loadQuestion(day);
			followAnswer(day);
		};

		return {
			open,
			followScore,
			followLeaderboard,
			tick,
			/**
			 * Shows the days behind, and fetches them the first time. Closing
			 * the list keeps what was read: the days have not changed.
			 */
			toggleHistory: (): void => {
				const isOpen = !store.isHistoryOpen();

				patchState(store, { isHistoryOpen: isOpen });

				if (
					isOpen &&
					!store.isHistoryLoaded() &&
					!store.isHistoryLoading()
				) {
					loadHistory(of(undefined));
				}
			},
			/** Today's question, again. */
			reopen: (): void => open(effect.today()),
			/** Picking is not guessing: it can be changed until it is sent. */
			select: (optionId: string): void => {
				if (store.answer() || store.isSubmitting()) return;

				patchState(store, {
					selectedOptionId: optionId,
					failure: null,
				});
			},
			submit: rxMethod<void>(
				pipe(
					filter(
						() =>
							!!store.selectedOptionId() &&
							!store.answer() &&
							!store.isSubmitting()
					),
					tap(() =>
						patchState(store, {
							isSubmitting: true,
							failure: null,
							nowMs: Date.now(),
						})
					),
					switchMap(() =>
						effect
							.submit$(
								store.day(),
								store.selectedOptionId() as string,
								store.startedAt()
									? Math.max(
											Math.floor(
												(Date.now() -
													(store.startedAt() as number)) /
													1000
											),
											0
										)
									: undefined
							)
							.pipe(
								tapResponse({
									next: (result) =>
										patchState(store, {
											answer: result.answer,
											score: result.score,
											isSubmitting: false,
											startedAt: null,
										}),
									error: (error: unknown) => {
										const failure =
											error instanceof DailyAnswerRejected
												? error.failure
												: 'unknown';

										// A nap fordult a lap alatt: a mai
										// kérdést kell elővenni, nem a tippet
										// újraküldeni. Előbb a nyitás, utána a
										// magyarázat — `open` takarítja az
										// állapotot, a hibaüzenetet is.
										if (failure === 'stale-day') {
											open(effect.today());
										}

										patchState(store, {
											isSubmitting: false,
											failure,
										});
									},
								})
							)
					)
				)
			),
		};
	}),
	withHooks({
		onInit(store, effect = inject(DailyQuestionEffect)) {
			store.open(effect.today());
			store.followScore(of(undefined));
			store.followLeaderboard(of(undefined));
			store.tick(of(undefined));
		},
	})
);
