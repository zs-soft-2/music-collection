import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ArtistModel } from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
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

import { OwnedArtistEffect } from '../../../data/owned-artist';
import { Crumb } from '../../../shared/page-breadcrumb';

interface OwnedArtistListState {
	artists: ArtistModel[];
	failed: boolean;
	loading: boolean;
	/** The band the collector asked to remove, waiting to be confirmed. */
	pendingRemoval: ArtistModel | null;
}

const initialState: OwnedArtistListState = {
	artists: [],
	failed: false,
	loading: true,
	pendingRemoval: null,
};

/**
 * The collector's own bands.
 *
 * The asking is here, not in the component: a band is not removed on the
 * click that asks for it but on the one that confirms it, and which band is
 * waiting for that second click is state, not a dialog a component puts up
 * on its own.
 */
export const OwnedArtistListStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => ({
		isEmpty: computed(() => !store.loading() && !store.artists().length),
		trail: computed<Crumb[]>(() => [
			{ label: text.translator()('nav.owned-artists') },
		]),
	})),
	withMethods((store, ownedArtistEffect = inject(OwnedArtistEffect)) => ({
		loadArtists: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { loading: true })),
				switchMap(() =>
					ownedArtistEffect.list$().pipe(
						tapResponse({
							next: (artists: ArtistModel[]) =>
								patchState(store, {
									artists,
									failed: false,
									loading: false,
								}),
							error: () =>
								patchState(store, {
									artists: [],
									failed: true,
									loading: false,
								}),
						})
					)
				)
			)
		),

		/** Asks first: the answer is the second click, not this one. */
		askRemove: (artist: ArtistModel) =>
			patchState(store, { pendingRemoval: artist, failed: false }),

		cancelRemove: () => patchState(store, { pendingRemoval: null }),

		confirmRemove: rxMethod<void>(
			pipe(
				switchMap(() => {
					const artist = store.pendingRemoval();

					if (!artist) {
						return [];
					}

					return ownedArtistEffect.remove$(artist).pipe(
						tapResponse({
							next: () =>
								patchState(store, { pendingRemoval: null }),
							error: () =>
								patchState(store, {
									failed: true,
									pendingRemoval: null,
								}),
						})
					);
				})
			)
		),
	})),
	withHooks({
		onInit(store) {
			store.loadArtists();
		},
	})
);
