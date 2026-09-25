import { filter, map, of, pipe, startWith, switchMap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DailyAnswer, DailyQuestionEntity } from '@music-collection/api';
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

import { DailyQuestionEffect } from '../../data/daily-question';

/** Where the reminder sends the collector. */
export const DAILY_QUESTION_PATH = '/daily-question';

export interface DailyQuestionBannerState {
	/** Today, as the game counts days. */
	day: string;
	/** There is a question to play at all. */
	hasQuestion: boolean;
	/** The day is already guessed at: nothing left to remind anybody of. */
	isAnswered: boolean;
	isSignedIn: boolean;
	/** Sent away in this browser, for this day. */
	isDismissed: boolean;
	/** The collector is already looking at the question. */
	isOnGamePage: boolean;
}

const initialState: DailyQuestionBannerState = {
	day: '',
	hasQuestion: false,
	isAnswered: false,
	isSignedIn: false,
	isDismissed: false,
	isOnGamePage: false,
};

/**
 * Whether the reminder belongs on the screen.
 *
 * Five things have to be true at once, which is four more than a banner
 * usually gets asked, so the decision is written out here rather than left in
 * the template: there has to be a question, a collector signed in to play it,
 * no guess yet, no closing gesture, and somewhere other than the game's own
 * page to be reminded on.
 */
export function showsBanner(state: DailyQuestionBannerState): boolean {
	return (
		state.isSignedIn &&
		state.hasQuestion &&
		!state.isAnswered &&
		!state.isDismissed &&
		!state.isOnGamePage
	);
}

/**
 * The reminder that today's question is still unanswered.
 *
 * It stays up for as long as that is true — it is the one thing in the app
 * that expires by itself at midnight — and goes away on three things: the
 * guess, the close button, and the day turning. Closing it is remembered per
 * day and per browser, so tomorrow's question gets its own reminder without
 * anybody having to switch it back on.
 *
 * The two documents it reads are the same two the game's page reads, so a
 * collector who opens the page pays for them once either way.
 */
export const DailyQuestionBannerStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		isVisible: computed(() =>
			showsBanner({
				day: store.day(),
				hasQuestion: store.hasQuestion(),
				isAnswered: store.isAnswered(),
				isSignedIn: store.isSignedIn(),
				isDismissed: store.isDismissed(),
				isOnGamePage: store.isOnGamePage(),
			})
		),
	})),
	withMethods(
		(
			store,
			effect = inject(DailyQuestionEffect),
			router = inject(Router)
		) => {
			/**
			 * Today's question and guess, followed for as long as the app is
			 * open: a guess made in another tab takes the reminder down here
			 * too, and so does answering it on the page itself.
			 */
			const follow = rxMethod<void>(
				pipe(
					switchMap(() => effect.uid$()),
					switchMap((uid) => {
						const day = effect.today();

						patchState(store, {
							day,
							isSignedIn: !!uid,
							isDismissed: effect.isDismissed(day),
							hasQuestion: false,
							isAnswered: false,
						});

						if (!uid) return of(null);

						return effect.question$(day).pipe(
							tapResponse({
								next: (question: DailyQuestionEntity | null) =>
									patchState(store, {
										hasQuestion: !!question,
									}),
								error: (error) => console.error(error),
							})
						);
					})
				)
			);

			const followAnswer = rxMethod<void>(
				pipe(
					switchMap(() => effect.uid$()),
					switchMap((uid) =>
						uid
							? effect.answer$(effect.today()).pipe(
									tapResponse({
										next: (answer: DailyAnswer | null) =>
											patchState(store, {
												isAnswered: !!answer,
											}),
										error: (error) => console.error(error),
									})
								)
							: of(null)
					)
				)
			);

			/** Where the collector is; the reminder steps aside on the page. */
			const followRoute = rxMethod<void>(
				pipe(
					switchMap(() =>
						router.events.pipe(
							filter(
								(event): event is NavigationEnd =>
									event instanceof NavigationEnd
							),
							map((event) => event.urlAfterRedirects),
							startWith(router.url)
						)
					),
					tapResponse({
						next: (url: string) => {
							patchState(store, {
								isOnGamePage:
									url.startsWith(DAILY_QUESTION_PATH),
							});

							// A tab maradhat nyitva éjfélen át. A következő
							// lépésnél már az új nap kérdését kell nézni,
							// különben a tegnapi tipp tartja lent a sávot.
							// (Üres nap = a követés még el sem indult.)
							if (store.day() && effect.today() !== store.day()) {
								follow(of(undefined));
								followAnswer(of(undefined));
							}
						},
						error: (error) => console.error(error),
					})
				)
			);

			return {
				follow,
				followAnswer,
				followRoute,
				/** Sends it away until the day turns. */
				dismiss: (): void => {
					effect.dismiss(store.day());
					patchState(store, { isDismissed: true });
				},
			};
		}
	),
	withHooks({
		onInit(store) {
			store.follow(of(undefined));
			store.followAnswer(of(undefined));
			store.followRoute(of(undefined));
		},
	})
);
