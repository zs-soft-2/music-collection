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
} from '../../data/collection-following';

interface CollectionFollowingState {
	followed: string[];
	/** The followed collections the collector shows to others. */
	shown: string[];
	/** The stored pick has arrived; before that nothing is known. */
	followingLoaded: boolean;
}

const initialState: CollectionFollowingState = {
	followed: [],
	shown: [],
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
			shownUids: computed(() => new Set(store.shown())),
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
						next: ({ followed, shown }: CollectionFollowing) =>
							patchState(store, {
								followed,
								shown,
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
				const drops = store.followedUids().has(uid);
				const followed = drops
					? store
							.followed()
							.filter((followedUid) => followedUid !== uid)
					: [...store.followed(), uid];
				// Dropping a collection takes it off the public page with it:
				// what is not followed cannot be shown as followed.
				const shown = drops
					? store.shown().filter((shownUid) => shownUid !== uid)
					: store.shown();

				patchState(store, { followed, shown });

				settings
					.save(COLLECTION_FOLLOWING_SETTING, { followed, shown })
					.catch((error) => {
						console.error('Followed collections not saved', error);
					});
			},
			/**
			 * Shows one of the followed collections to others, or takes it
			 * back. Only a followed collection can be shown: the switch is
			 * about what the collector has taken on, not about the catalog.
			 */
			toggleShown: (uid: string): void => {
				if (!store.followedUids().has(uid)) {
					return;
				}

				const shown = store.shownUids().has(uid)
					? store.shown().filter((shownUid) => shownUid !== uid)
					: [...store.shown(), uid];

				patchState(store, { shown });

				settings
					.save(COLLECTION_FOLLOWING_SETTING, {
						followed: store.followed(),
						shown,
					})
					.catch((error) => {
						console.error('Shown collections not saved', error);
					});
			},
		}))
	);
}
