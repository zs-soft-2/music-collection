import {
	EMPTY,
	Observable,
	exhaustMap,
	filter,
	from,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	AlbumStateService,
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	PhotoSignals,
	ReleaseEntity,
	ReleaseStateService,
	RoleNames,
	ScanCandidate,
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
import { NgxPermissionsService } from 'ngx-permissions';

import { PhotoScanEffect, PreparedPhoto } from '../../data/photo-scan';
import { ReleaseRequestEffect } from '../../data/release-request';
import {
	ScanCandidateView,
	toCandidateViews,
	toScanRequest,
} from './scan.mapper';

interface ScanPageState {
	/** The scaled photo waiting to be sent, with its preview. */
	photo: PreparedPhoto | null;
	scanning: boolean;
	error: string | null;
	/** What the model read; `null` when the barcode alone settled it. */
	signals: PhotoSignals | null;
	candidates: ScanCandidate[];
	/** A scan has run — tells "nothing found" apart from "not started". */
	scanned: boolean;
	albums: AlbumEntity[];
	releases: ReleaseEntity[];
	ownedItems: CollectionItemEntity[];
	userId: string | null;
	/** May add to their collection, and so may scan. */
	canCollect: boolean;
	requesting: boolean;
	requestError: string | null;
	/** Candidates already asked for, so the button is not offered twice. */
	requestedKeys: string[];
}

const initialState: ScanPageState = {
	photo: null,
	scanning: false,
	error: null,
	signals: null,
	candidates: [],
	scanned: false,
	albums: [],
	releases: [],
	ownedItems: [],
	userId: null,
	canCollect: false,
	requesting: false,
	requestError: null,
	requestedKeys: [],
};

/** What the collector reads when the scan fails. */
function describeError(error: unknown): string {
	const code = (error as { code?: string })?.code ?? '';

	if (code.endsWith('resource-exhausted')) {
		return 'Discogs is busy right now. Try again in a minute.';
	}
	if (code.endsWith('invalid-argument')) {
		return 'This photo could not be used. Try another one.';
	}
	if (code.endsWith('permission-denied')) {
		return 'You are not allowed to do this.';
	}
	if (code.endsWith('unavailable')) {
		return 'The lookup is unavailable right now. Try again later.';
	}

	return 'Something went wrong. Try again later.';
}

/** Selects a feature's entities and requests the list while it is empty. */
function entities$<T>(
	select: () => Observable<T[]>,
	dispatchList: () => void
): Observable<T[]> {
	return select().pipe(
		tap((items) => {
			if (!items?.length) {
				dispatchList();
			}
		}),
		filter((items) => items?.length > 0)
	);
}

/**
 * Scanning a record from a photo: the picture goes to the server, and what
 * comes back is matched against the catalog here. Nothing is written without
 * the collector — every candidate leads to a confirmation, either on the
 * album page or as a request to the admin.
 */
export const ScanPageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** The candidates, each knowing where it stands in the catalog. */
		candidateViews: computed((): ScanCandidateView[] =>
			toCandidateViews(store.candidates(), {
				albums: store.albums(),
				releases: store.releases(),
				ownedItems: store.ownedItems(),
			})
		),
		/** A scan ran and recognised nothing: another photo is needed. */
		empty: computed(
			() =>
				store.scanned() &&
				!store.scanning() &&
				!store.error() &&
				store.candidates().length === 0
		),
	})),
	withMethods(
		(
			store,
			scanEffect = inject(PhotoScanEffect),
			releaseRequestEffect = inject(ReleaseRequestEffect),
			albumStateService = inject(AlbumStateService),
			releaseStateService = inject(ReleaseStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService)
		) => ({
			/** Sends the photo and keeps what the server found. */
			identify: rxMethod<PreparedPhoto>(
				pipe(
					filter(() => !store.scanning()),
					tap((photo) =>
						patchState(store, {
							photo,
							scanning: true,
							error: null,
							candidates: [],
							signals: null,
							requestError: null,
						})
					),
					exhaustMap((photo) =>
						scanEffect.identify$(photo).pipe(
							tapResponse({
								next: (result) =>
									patchState(store, {
										signals: result.signals,
										candidates: result.candidates,
										scanning: false,
										scanned: true,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										scanning: false,
										scanned: true,
										error: describeError(error),
									});
								},
							})
						)
					)
				)
			),

			/**
			 * Asks the admin for a record whose album the catalog does not
			 * have; approving it creates the album and the artist too.
			 */
			request: rxMethod<{
				view: ScanCandidateView;
				candidate: ScanCandidate;
			}>(
				pipe(
					filter(() => !store.requesting() && !!store.userId()),
					tap(() =>
						patchState(store, {
							requesting: true,
							requestError: null,
						})
					),
					exhaustMap(({ view, candidate }) => {
						const userId = store.userId();

						if (!userId) {
							return EMPTY;
						}

						return releaseRequestEffect
							.request$(toScanRequest(candidate, userId))
							.pipe(
								tapResponse({
									next: () =>
										patchState(store, {
											requesting: false,
											requestedKeys: [
												...store.requestedKeys(),
												view.key,
											],
										}),
									error: (error) => {
										console.error(error);
										patchState(store, {
											requesting: false,
											requestError: describeError(error),
										});
									},
								})
							);
					})
				)
			),

			loadAlbums: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => albumStateService.selectEntities$(),
							() =>
								albumStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (albums) => patchState(store, { albums }),
						error: (error) => console.error(error),
					})
				)
			),

			loadCatalogReleases: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => releaseStateService.selectEntities$(),
							() =>
								releaseStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (releases) => patchState(store, { releases }),
						error: (error) => console.error(error),
					})
				)
			),

			/** The collector's own copies, to spot what they already have. */
			loadOwnedItems: rxMethod<void>(
				pipe(
					switchMap(() =>
						collectionItemStateService.selectLoadedEntities$()
					),
					tapResponse({
						next: (ownedItems) =>
							patchState(store, { ownedItems }),
						error: (error) => console.error(error),
					})
				)
			),

			/** Who is signed in and whether they may collect at all. */
			loadCollector: rxMethod<void>(
				pipe(
					switchMap(() =>
						authenticationStateService.selectAuthenticatedUser$()
					),
					switchMap((user) =>
						permissionsService.permissions$.pipe(
							tap((permissions) =>
								patchState(store, {
									userId: user?.uid ?? null,
									canCollect:
										!!user?.uid &&
										(CollectionItemPermissionsService.createCollectionItemEntity in
											permissions ||
											RoleNames.ADMIN in permissions),
								})
							)
						)
					)
				)
			),
		})
	),
	withMethods((store, scanEffect = inject(PhotoScanEffect)) => ({
		/**
		 * Scales the picked file, then scans it. The scaling happens here and
		 * not in the browser's upload: a phone photo is ten times larger than
		 * what the recognition needs.
		 */
		scan: rxMethod<Blob>(
			pipe(
				filter(() => !store.scanning()),
				tap(() => patchState(store, { error: null })),
				switchMap((file) =>
					from(scanEffect.prepare(file)).pipe(
						tapResponse({
							next: (photo) => store.identify(photo),
							error: (error: unknown) => {
								console.error(error);
								patchState(store, {
									error: 'This photo could not be read. Try another one.',
								});
							},
						})
					)
				)
			)
		),

		/** Back to the empty state, ready for the next record. */
		reset(): void {
			const photo = store.photo();

			if (photo) {
				URL.revokeObjectURL(photo.previewUrl);
			}
			patchState(store, {
				photo: null,
				candidates: [],
				signals: null,
				scanned: false,
				error: null,
				requestError: null,
			});
		},
	})),
	withHooks({
		onInit(store) {
			store.loadCollector();
			store.loadAlbums();
			store.loadCatalogReleases();
			store.loadOwnedItems();
		},
	})
);
