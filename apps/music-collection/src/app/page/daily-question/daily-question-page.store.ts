import { filter, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	DailyAnswer,
	DailyQuestionEntity,
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
} from '../../data/daily-question';

import { toSubjectLink, toView } from './daily-question.mapper';

interface DailyQuestionPageState {
	/** The day being played, `YYYY-MM-DD`; the effect decides which. */
	day: string;
	isLoading: boolean;
	question: DailyQuestionEntity | null;
	/** The guess, once made; this is also what reveals the answer. */
	answer: DailyAnswer | null;
	score: DailyQuestionScore;
	/** Picked but not sent yet — a guess is only spent when it is sent. */
	selectedOptionId: string | null;
	isSubmitting: boolean;
	failure: DailyAnswerFailure | null;
}

const initialState: DailyQuestionPageState = {
	day: '',
	isLoading: true,
	question: null,
	answer: null,
	score: EMPTY_DAILY_QUESTION_SCORE,
	selectedOptionId: null,
	isSubmitting: false,
	failure: null,
};

export const DailyQuestionPageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
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
		hasNoQuestion: computed(() => !store.isLoading() && !store.question()),
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
	})),
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
								patchState(store, { answer }),
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
			});
			loadQuestion(day);
			followAnswer(day);
		};

		return {
			open,
			followScore,
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
						})
					),
					switchMap(() =>
						effect
							.submit$(
								store.day(),
								store.selectedOptionId() as string
							)
							.pipe(
								tapResponse({
									next: (result) =>
										patchState(store, {
											answer: result.answer,
											score: result.score,
											isSubmitting: false,
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
		},
	})
);
