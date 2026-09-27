import { exhaustMap, filter, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	ARTIST_FEATURE_KEY,
	ArtistModel,
	EntityRequest,
	EntityTypeEnum,
} from '@music-collection/api';
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
import { RequestEffect } from '../../../data/request';
import { Crumb } from '../../../shared/page-breadcrumb';

interface OwnedArtistListState {
	artists: ArtistModel[];
	failed: boolean;
	loading: boolean;
	/** The band the collector asked to remove, waiting to be confirmed. */
	pendingRemoval: ArtistModel | null;
	/** What the collector has asked the catalog to take in. */
	requests: EntityRequest[];
	/** The band being submitted right now; one at a time. */
	submitting: string | null;
	/** True when the last submission did not get through. */
	submitFailed: boolean;
}

const initialState: OwnedArtistListState = {
	artists: [],
	failed: false,
	loading: true,
	pendingRemoval: null,
	requests: [],
	submitting: null,
	submitFailed: false,
};

/** The owned document a request was made from, e.g. `…/owned-artist/{uid}`. */
const ownedUidOf = (request: EntityRequest): string =>
	request.target.ownedPath?.split('/').pop() ?? '';

/**
 * The collector's own bands, and where each of them stands with the catalog.
 *
 * The asking is here, not in the component: a band is not removed on the
 * click that asks for it but on the one that confirms it, and which band is
 * waiting for that second click is state, not a dialog a component puts up
 * on its own.
 *
 * Offering a band to the catalog is the same kind of thing. What it sends is
 * a request, and the requests are read back alongside the bands, so a band
 * already waiting for an answer is not offered up a second time.
 */
export const OwnedArtistListStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => ({
		isEmpty: computed(() => !store.loading() && !store.artists().length),
		trail: computed<Crumb[]>(() => [
			{ label: text.translator()('nav.owned-artists') },
		]),
		/**
		 * The latest request per band. A band may be asked about more than
		 * once — a refusal can be answered with better grounds — and what the
		 * list shows is where it stands now, which is the newest of them.
		 */
		requestByArtist: computed(() => {
			const latest = new Map<string, EntityRequest>();

			for (const request of store.requests()) {
				const uid = ownedUidOf(request);

				if (uid && !latest.has(uid)) {
					latest.set(uid, request);
				}
			}

			return latest;
		}),
	})),
	withMethods(
		(
			store,
			ownedArtistEffect = inject(OwnedArtistEffect),
			requestEffect = inject(RequestEffect)
		) => ({
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
								error: (error) => {
									console.error(
										'The owned bands could not be read',
										error
									);
									patchState(store, {
										artists: [],
										failed: true,
										loading: false,
									});
								},
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
								error: (error) => {
									console.error(
										'An owned band was not removed',
										error
									);
									patchState(store, {
										failed: true,
										pendingRemoval: null,
									});
								},
							})
						);
					})
				)
			),

			/**
			 * The requests the collector has made, so a band that is already
			 * waiting for an answer is not offered for submitting again. A read
			 * that fails leaves the list empty rather than the page broken: not
			 * knowing where a band stands is no reason to hide the bands.
			 */
			loadRequests: rxMethod<void>(
				pipe(
					switchMap(() =>
						requestEffect.listMine$().pipe(
							tapResponse({
								next: (requests: EntityRequest[]) =>
									patchState(store, { requests }),
								error: (error) => {
									console.error(
										'The requests could not be read',
										error
									);
									patchState(store, { requests: [] });
								},
							})
						)
					)
				)
			),

			/**
			 * Asks the catalog to take the band in. What is sent is what the
			 * collector saved, and it stays theirs either way — an approval
			 * copies it into the catalog, it does not move it out of here.
			 */
			submit: rxMethod<ArtistModel>(
				pipe(
					filter(() => !store.submitting()),
					tap((artist) =>
						patchState(store, {
							submitting: artist.uid,
							submitFailed: false,
						})
					),
					exhaustMap((artist) =>
						requestEffect
							.submitOwned$({
								featureKey: ARTIST_FEATURE_KEY,
								entityType: EntityTypeEnum.Artist,
								entity: artist as unknown as Record<
									string,
									unknown
								> & { uid: string },
							})
							.pipe(
								tapResponse({
									next: () =>
										patchState(store, { submitting: null }),
									error: (error) => {
										console.error(
											'A band was not submitted',
											error
										);
										patchState(store, {
											submitting: null,
											submitFailed: true,
										});
									},
								})
							)
					)
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.loadArtists();
			store.loadRequests();
		},
	})
);
