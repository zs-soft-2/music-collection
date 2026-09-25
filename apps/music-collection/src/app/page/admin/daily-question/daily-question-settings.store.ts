import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	ComposeDailyQuestionResult,
	DailyQuestionEntity,
	DailyQuestionSettings,
	DailyQuestionTemplateInfo,
	RefreshLeaderboardResult,
	dailyQuestionDay,
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
	DEFAULT_DAILY_QUESTION_SETTINGS,
	DailyQuestionEffect,
} from '../../../data/daily-question';
import { toQuestionFrame } from '../../../shared/daily-question';
import { describeWriteError } from '../music-collection/music-collection-admin.errors';

/** What the server clamps to as well; the form refuses the nonsense first. */
const LIMITS = {
	timeLimitSec: 600,
	points: 1000,
	streakBonusPerDay: 100,
	maxStreakBonusDays: 60,
	speedBonusMax: 500,
	bonusDayMultiplier: 10,
	leaderboardSize: 100,
} as const;

/** Which number fields there are, and what each may reach. */
export type NumberField = keyof typeof LIMITS;

/**
 * How many days back the list of past questions goes. A month is enough to
 * see whether the game repeats itself; every day of it is a document read,
 * and the composing only looks two weeks back anyway.
 */
export const HISTORY_DAYS = 30;

interface DailyQuestionSettingsState {
	settings: DailyQuestionSettings;
	/** Every kind of question the engine knows, as the server reports it. */
	templates: DailyQuestionTemplateInfo[];
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
	/** Epoch milliseconds of the last successful save; null until one. */
	savedAt: number | null;
	isComposing: boolean;
	/** What the by-hand composing did, for the line under the button. */
	composed: ComposeDailyQuestionResult | null;
	isRefreshing: boolean;
	refreshed: RefreshLeaderboardResult | null;
	/** What the game has been asking, newest first. */
	history: DailyQuestionEntity[];
	isHistoryLoading: boolean;
}

const initialState: DailyQuestionSettingsState = {
	settings: DEFAULT_DAILY_QUESTION_SETTINGS,
	templates: [],
	isLoading: true,
	isSaving: false,
	error: null,
	savedAt: null,
	isComposing: false,
	composed: null,
	isRefreshing: false,
	refreshed: null,
	history: [],
	isHistoryLoading: true,
};

/**
 * Admin: the rules of the daily question — the clock, what a guess pays, how
 * often a day pays double, which kinds of question may be drawn, and how many
 * places the leaderboard shows.
 *
 * The kinds of question are not listed here but read from the server: the
 * engine is what knows its own templates, and a copy kept in the client would
 * sooner or later offer a switch for something nobody draws.
 *
 * A change takes effect with the next question composed, not with the one
 * already up — the day's rules are written into the question when it is made.
 * That is what the „compose now” button is for.
 */
export const DailyQuestionSettingsStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		canSave: computed(() => !store.isSaving() && !store.isLoading()),
		/** The switches, in the order the engine reports them. */
		templateRows: computed(() => {
			const off = new Set(store.settings().disabledTemplates);

			return store.templates().map((template) => ({
				...template,
				enabled: !off.has(template.key),
			}));
		}),
		enabledCount: computed(
			() =>
				store
					.templates()
					.filter(
						(template) =>
							!store
								.settings()
								.disabledTemplates.includes(template.key)
					).length
		),
		/** The chance as a percentage, which is how the form asks for it. */
		bonusDayPercent: computed(() =>
			Math.round(store.settings().bonusDayChance * 100)
		),
		today: computed(() => dailyQuestionDay()),
		/**
		 * The past questions as sentences, the way the collector read them —
		 * a list of template keys would say what was drawn, not what was
		 * asked.
		 */
		historyRows: computed(() =>
			store.history().map((question) => ({
				day: question.day,
				difficulty: question.difficulty,
				templateKey: question.templateKey,
				frame: toQuestionFrame(question.templateKey, question.params),
			}))
		),
	})),
	withMethods((store, effect = inject(DailyQuestionEffect)) => {
		const load = rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true, error: null })),
				switchMap(() => effect.settings$()),
				tapResponse({
					next: (view) =>
						patchState(store, {
							settings: view.settings,
							templates: view.templates,
							isLoading: false,
						}),
					error: (error: unknown) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: describeWriteError(error),
						});
					},
				})
			)
		);

		/**
		 * What the game has been asking. Read straight from the questions
		 * rather than through a callable: the documents are public — the
		 * answer lives elsewhere — so a list of them needs no server of its
		 * own, and no deploy to stay in step.
		 */
		const loadHistory = rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isHistoryLoading: true })),
				switchMap(() => effect.questionHistory$(HISTORY_DAYS)),
				tapResponse({
					next: (history) =>
						patchState(store, { history, isHistoryLoading: false }),
					error: (error: unknown) => {
						console.error(error);
						patchState(store, { isHistoryLoading: false });
					},
				})
			)
		);

		const set = (change: Partial<DailyQuestionSettings>): void =>
			patchState(store, {
				settings: { ...store.settings(), ...change },
				error: null,
			});

		return {
			load,
			loadHistory,
			set,
			setNumber(field: NumberField, value: string): void {
				const parsed = Number.parseInt(value, 10);

				if (!Number.isFinite(parsed)) return;

				const bounded = Math.min(
					Math.max(parsed, field === 'bonusDayMultiplier' ? 1 : 0),
					LIMITS[field]
				);

				set({ [field]: bounded } as Partial<DailyQuestionSettings>);
			},
			setPoints(
				difficulty: 'easy' | 'medium' | 'hard',
				value: string
			): void {
				const parsed = Number.parseInt(value, 10);

				if (!Number.isFinite(parsed)) return;

				set({
					points: {
						...store.settings().points,
						[difficulty]: Math.min(
							Math.max(parsed, 0),
							LIMITS.points
						),
					},
				});
			},
			/** The form asks for a percentage; the setting keeps a fraction. */
			setBonusPercent(value: string): void {
				const parsed = Number.parseInt(value, 10);

				if (!Number.isFinite(parsed)) return;

				set({
					bonusDayChance: Math.min(Math.max(parsed, 0), 100) / 100,
				});
			},
			toggleTemplate(key: string, enabled: boolean): void {
				const off = new Set(store.settings().disabledTemplates);

				if (enabled) off.delete(key);
				else off.add(key);

				set({ disabledTemplates: [...off] });
			},
			save: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, { isSaving: true, error: null })
					),
					switchMap(() => effect.saveSettings$(store.settings())),
					tapResponse({
						next: (view) =>
							patchState(store, {
								// The server clamps, so what it returns is the
								// truth — not what the form sent.
								settings: view.settings,
								templates: view.templates,
								isSaving: false,
								savedAt: Date.now(),
							}),
						error: (error: unknown) => {
							console.error(error);
							patchState(store, {
								isSaving: false,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
			/**
			 * Today's question by hand. Without `force` a day already composed
			 * is left alone — replacing a question somebody has answered would
			 * grade them against a question they never saw.
			 */
			compose: rxMethod<boolean>(
				pipe(
					tap(() =>
						patchState(store, {
							isComposing: true,
							composed: null,
							error: null,
						})
					),
					switchMap((force) => effect.compose$(undefined, force)),
					tapResponse({
						next: (composed) => {
							patchState(store, {
								composed,
								isComposing: false,
							});

							// A lista élére most került oda a mai kérdés.
							if (composed.created) loadHistory();
						},
						error: (error: unknown) => {
							console.error(error);
							patchState(store, {
								isComposing: false,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
			refreshLeaderboard: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, {
							isRefreshing: true,
							refreshed: null,
							error: null,
						})
					),
					switchMap(() => effect.refreshLeaderboard$()),
					tapResponse({
						next: (refreshed) =>
							patchState(store, {
								refreshed,
								isRefreshing: false,
							}),
						error: (error: unknown) => {
							console.error(error);
							patchState(store, {
								isRefreshing: false,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
		};
	}),
	withHooks({
		onInit(store) {
			store.load();
			store.loadHistory();
		},
	})
);
