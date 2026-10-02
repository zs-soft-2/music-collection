import { of, pipe, switchMap } from 'rxjs';

import { computed, inject } from '@angular/core';
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

import { AlbumRating, RatingEffect, ratingFor } from '../../data/rating';
import { FinishedRecord, PlayerStore } from '../player';

/**
 * Which record the question is about, out of what just finished and what the
 * collector has already said.
 *
 * Its own function because it is the whole decision: everything else here is
 * a write and a dismissal. A record already rated is left alone — asking
 * again would be asking the collector to defend themselves — and a record
 * they sent away is gone from `finished`, so it is not asked about either
 * until the next time they put it on.
 */
export function recordToAsk(
	finished: FinishedRecord | null,
	ratings: readonly AlbumRating[]
): FinishedRecord | null {
	return finished && !ratingFor(ratings, finished.albumId) ? finished : null;
}

interface VerdictPromptState {
	/** The collector's verdicts, to know which record needs no asking. */
	ratings: AlbumRating[];
	writing: boolean;
	failed: boolean;
}

/**
 * The question after a record has played: the one moment a collector has an
 * opinion ready and nothing else to do with it.
 *
 * It asks about a record heard right through and never judged. A record
 * already rated is left alone — asking again would be asking the collector
 * to defend themselves — and so is one they sent away, until the next time
 * they put it on.
 */
export const VerdictPromptStore = signalStore(
	withState<VerdictPromptState>({
		ratings: [],
		writing: false,
		failed: false,
	}),
	withComputed((store, player = inject(PlayerStore)) => ({
		/** The record to ask about, or null while there is nothing to ask. */
		asking: computed((): FinishedRecord | null =>
			recordToAsk(player.finished(), store.ratings())
		),
	})),
	withMethods(
		(
			store,
			player = inject(PlayerStore),
			ratingEffect = inject(RatingEffect)
		) => ({
			loadRatings: rxMethod<void>(
				pipe(
					switchMap(() => ratingEffect.list$()),
					tapResponse({
						next: (ratings: AlbumRating[]) =>
							patchState(store, { ratings }),
						error: (error) => console.error(error),
					})
				)
			),
			/** Keeps the verdict and takes the question down. */
			async rate(stars: number): Promise<void> {
				const record = store.asking();

				if (!record || store.writing()) {
					return;
				}

				patchState(store, { writing: true, failed: false });

				try {
					await ratingEffect.rate(record, { stars, note: null });
					player.clearFinished();
				} catch (error) {
					console.error('Verdict not kept', error);
					patchState(store, { failed: true });
				} finally {
					patchState(store, { writing: false });
				}
			},
			/** Sends the question away; the record stays unjudged. */
			dismiss(): void {
				patchState(store, { failed: false });
				player.clearFinished();
			},
		})
	),
	withHooks({
		onInit(store) {
			store.loadRatings(of(undefined));
		},
	})
);
