import { exhaustMap, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	AuthenticationStateService,
	DiscogsVersion,
	ReleaseRequest,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	type,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ReleaseRequestEffect } from '../../../data/release-request';
import {
	ReleaseRequestDraft,
	toDiscogsVersionViews,
	toPendingRequestView,
} from '../album.mapper';
import { albumOf, describeError } from './album-page.helpers';

interface AlbumReleaseRequestState {
	/** The signed-in user's release requests (all albums). */
	requests: ReleaseRequest[];
	/** Discogs pressings of the master `discogsVersionsFor`. */
	discogsVersions: DiscogsVersion[];
	discogsVersionsFor: number | null;
	discogsLoading: boolean;
	discogsError: string | null;
	requesting: boolean;
	requestError: string | null;
}

const initialState: AlbumReleaseRequestState = {
	requests: [],
	discogsVersions: [],
	discogsVersionsFor: null,
	discogsLoading: false,
	discogsError: null,
	requesting: false,
	requestError: null,
};

/** The pending requests' Discogs pressings: those are asked for already. */
export function requestedPressings(requests: ReleaseRequest[]): Set<number> {
	return new Set(
		requests
			.filter((request) => request.status === 'pending')
			.flatMap((request) =>
				request.discogsReleaseId ? [request.discogsReleaseId] : []
			)
	);
}

/**
 * A pressing the catalog does not have yet: the album's Discogs pressings to
 * pick it from, and the request that asks the admin to add it. The picker
 * closes once the request is sent.
 */
export function withAlbumReleaseRequest() {
	return signalStoreFeature(
		{
			state: type<{
				albumId: string | null;
				albums: AlbumEntity[];
				userId: string | null;
				pickerOpen: boolean;
			}>(),
		},
		withState(initialState),
		withComputed((store) => {
			const albumEntity = computed(
				() => albumOf(store.albums(), store.albumId()) ?? null
			);

			return {
				/** The album's Discogs master: its pressings can be requested. */
				discogsMasterId: computed(
					() => albumEntity()?.discogs?.masterId ?? null
				),
				/** The collector's pending requests for this album. */
				pendingRequests: computed(() =>
					store
						.requests()
						.filter(
							(request) =>
								request.status === 'pending' &&
								request.album?.uid === store.albumId()
						)
						.map(toPendingRequestView)
				),
				/** The collector's rejected requests for this album, with the reason. */
				rejectedRequests: computed(() =>
					store
						.requests()
						.filter(
							(request) =>
								request.status === 'rejected' &&
								request.album?.uid === store.albumId()
						)
						.map(toPendingRequestView)
				),
				discogsOptions: computed(() => {
					const masterId = albumEntity()?.discogs?.masterId ?? null;
					if (!masterId || store.discogsVersionsFor() !== masterId) {
						return [];
					}
					return toDiscogsVersionViews(
						store.discogsVersions(),
						requestedPressings(store.requests())
					);
				}),
			};
		}),
		withMethods(
			(
				store,
				authenticationStateService = inject(AuthenticationStateService),
				releaseRequestEffect = inject(ReleaseRequestEffect)
			) => {
				/** The Discogs pressings of the album's master, once per master. */
				const loadDiscogsVersions = rxMethod<number>(
					pipe(
						filter(
							(masterId) =>
								masterId !== store.discogsVersionsFor() ||
								!!store.discogsError()
						),
						tap(() =>
							patchState(store, {
								discogsLoading: true,
								discogsError: null,
							})
						),
						switchMap((masterId) =>
							releaseRequestEffect
								.listDiscogsVersions$(masterId)
								.pipe(
									tapResponse({
										next: (discogsVersions) =>
											patchState(store, {
												discogsVersions,
												discogsVersionsFor: masterId,
												discogsLoading: false,
											}),
										error: (error) => {
											console.error(error);
											patchState(store, {
												discogsLoading: false,
												discogsError:
													describeError(error),
											});
										},
									})
								)
						)
					)
				);

				return {
					/** The signed-in user's release requests; follows sign-in. */
					loadRequests: rxMethod<void>(
						pipe(
							switchMap(() =>
								authenticationStateService.selectAuthenticatedUser$()
							),
							map((user) => user?.uid ?? ''),
							switchMap((userId) =>
								(userId
									? releaseRequestEffect.listByUser$(userId)
									: of([])
								).pipe(
									tapResponse({
										next: (requests) =>
											patchState(store, { requests }),
										error: (error) => console.error(error),
									})
								)
							)
						)
					),
					loadDiscogsVersions,
					/** Looks up the album's pressings on Discogs. */
					showDiscogsVersions(): void {
						const masterId = store.discogsMasterId();
						if (masterId) {
							loadDiscogsVersions(masterId);
						}
					},
					/** Sends the request to the admin; the picker closes when sent. */
					requestRelease: rxMethod<ReleaseRequestDraft>(
						pipe(
							filter(() => !store.requesting()),
							map((draft) => {
								const album = albumOf(
									store.albums(),
									store.albumId()
								);
								const userId = store.userId();

								return album && userId
									? releaseRequestEffect.request$({
											userId,
											album: {
												uid: album.uid,
												name: album.name,
												artistUid:
													album.artist?.uid ?? null,
												artistName:
													album.artist?.name ?? null,
											},
											status: 'pending',
											discogsMasterId:
												album.discogs?.masterId ?? null,
											discogsReleaseId:
												draft.discogsReleaseId,
											pressing: draft.pressing,
											note: draft.note,
											createdAt: Date.now(),
										})
									: null;
							}),
							filter((request$) => request$ !== null),
							tap(() =>
								patchState(store, {
									requesting: true,
									requestError: null,
								})
							),
							exhaustMap((request$) =>
								request$.pipe(
									tapResponse({
										next: () =>
											patchState(store, {
												requesting: false,
												pickerOpen: false,
											}),
										error: (error) => {
											console.error(error);
											patchState(store, {
												requesting: false,
												requestError:
													describeError(error),
											});
										},
									})
								)
							)
						)
					),
				};
			}
		)
	);
}
