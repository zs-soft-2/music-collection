import { pipe, switchMap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { UserSettingsEffect } from '../../data/user-settings';

import {
	COLLECTION_FOLLOWING_SETTING,
	CollectionFollowing,
} from './collection-following.setting';

interface CollectionFollowingState {
	followed: string[];
	/** The stored pick has arrived; before that nothing is known. */
	followingLoaded: boolean;
}

const initialState: CollectionFollowingState = {
	followed: [],
	followingLoaded: false,
};

/**
 * The collector's pick of collections, for every page that shows one. The
 * list is kept with the user's other settings — on the account when signed
 * in, in this browser otherwise — so both the list and the detail page read
 * and change the same thing.
 */
export function withCollectionFollowing() {
	return signalStoreFeature(
		withState(initialState),
		withComputed((store) => ({
			followedUids: computed(() => new Set(store.followed())),
			/** Nothing picked: a page then stands in the whole list for it. */
			followsNothing: computed(() => store.followed().length === 0),
		})),
		withMethods((store, settings = inject(UserSettingsEffect)) => ({
			/** Follows the stored pick, and any change made elsewhere. */
			loadFollowing: rxMethod<void>(
				pipe(
					switchMap(() =>
						settings.value$(COLLECTION_FOLLOWING_SETTING)
					),
					tapResponse({
						next: ({ followed }: CollectionFollowing) =>
							patchState(store, {
								followed,
								followingLoaded: true,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { followingLoaded: true });
						},
					})
				)
			),
			/**
			 * Takes effect at once and is written after: a pick the account
			 * refuses is worth less than a button that answers.
			 */
			toggleFollow: (uid: string): void => {
				const followed = store.followedUids().has(uid)
					? store
							.followed()
							.filter((followedUid) => followedUid !== uid)
					: [...store.followed(), uid];

				patchState(store, { followed });

				settings
					.save(COLLECTION_FOLLOWING_SETTING, { followed })
					.catch((error) => {
						console.error('Followed collections not saved', error);
					});
			},
		}))
	);
}
