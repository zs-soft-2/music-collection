import {
	EMPTY,
	Observable,
	concatMap,
	exhaustMap,
	filter,
	from,
	pipe,
	switchMap,
	tap,
	toArray,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	AlbumStateService,
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	MAX_SHELF_PHOTOS,
	PhotoMedia,
	ReleaseEntity,
	ReleaseStateService,
	RoleNames,
	ShelfScanSpine,
	SpineField,
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

import { ReleaseRequestEffect } from '../../data/release-request';
import { PreparedShelfPhoto, ShelfScanEffect } from '../../data/shelf-scan';
import {
	ShelfRow,
	SpineEdit,
	toShelfRequest,
	toShelfRows,
} from './shelf-scan.mapper';

interface ShelfScanPageState {
	/** One or two photos of the compartment, waiting to be sent. */
	photos: PreparedShelfPhoto[];
	media: PhotoMedia | null;
	scanning: boolean;
	error: string | null;
	/** What the server read — kept as it came, so the edits stay visible. */
	spines: ShelfScanSpine[];
	/** How many spines each photo counted. */
	spineCounts: number[];
	/** The collector's corrections, by spine position. */
	edits: Record<number, SpineEdit>;
	/** Positions left out of the submission. */
	skipped: number[];
	/** A scan has run — tells "nothing found" apart from "not started". */
	scanned: boolean;
	albums: AlbumEntity[];
	releases: ReleaseEntity[];
	ownedItems: CollectionItemEntity[];
	userId: string | null;
	canCollect: boolean;
	submitting: boolean;
	submitError: string | null;
	/** Positions already asked for, so nothing is requested twice. */
	requestedPositions: number[];
}

const initialState: ShelfScanPageState = {
	photos: [],
	media: 'vinyl',
	scanning: false,
	error: null,
	spines: [],
	spineCounts: [],
	edits: {},
	skipped: [],
	scanned: false,
	albums: [],
	releases: [],
	ownedItems: [],
	userId: null,
	canCollect: false,
	submitting: false,
	submitError: null,
	requestedPositions: [],
};

/** What the collector reads when the scan fails. */
function describeError(error: unknown): string {
	const code = (error as { code?: string })?.code ?? '';

	if (code.endsWith('resource-exhausted')) {
		return 'The reading is busy right now. Try again in a minute.';
	}
	if (code.endsWith('invalid-argument')) {
		return 'These photos could not be used. Try another one.';
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
 * Scanning a shelf compartment: two photos go to the server, and what comes
 * back is a table the collector corrects before anything is submitted. The
 * rows are matched against the catalog here, where the catalog already is.
 *
 * Nothing is written without the collector, and nothing is written in bulk:
 * a row asks for a pressing the catalog does not have, one request each.
 */
export const ShelfScanPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const rows = computed((): ShelfRow[] =>
			toShelfRows(store.spines(), store.edits(), {
				albums: store.albums(),
				releases: store.releases(),
				ownedItems: store.ownedItems(),
			})
		);

		return {
			rows,
			/** The rows that would be submitted: kept, and worth submitting. */
			submittable: computed(() =>
				rows().filter(
					(row) =>
						!store.skipped().includes(row.position) &&
						!store.requestedPositions().includes(row.position) &&
						row.identifiable &&
						row.state !== 'in-collection'
				)
			),
			/** Rows the collector has to look at before submitting. */
			needsAttention: computed(
				() =>
					rows().filter(
						(row) => row.unreadable || row.conflicts.length
					).length
			),
			/**
			 * The photos counted different numbers of spines, so one of them
			 * saw a record the list does not have.
			 */
			countMismatch: computed(
				() => new Set(store.spineCounts()).size > 1
			),
			/** A scan ran and read nothing: another photo is needed. */
			empty: computed(
				() =>
					store.scanned() &&
					!store.scanning() &&
					!store.error() &&
					store.spines().length === 0
			),
			canAddPhoto: computed(
				() => store.photos().length < MAX_SHELF_PHOTOS
			),
		};
	}),
	withMethods(
		(
			store,
			scanEffect = inject(ShelfScanEffect),
			releaseRequestEffect = inject(ReleaseRequestEffect),
			albumStateService = inject(AlbumStateService),
			releaseStateService = inject(ReleaseStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService)
		) => ({
			/** Sends the photos and keeps what the server read. */
			identify: rxMethod<void>(
				pipe(
					filter(
						() => !store.scanning() && store.photos().length > 0
					),
					tap(() =>
						patchState(store, {
							scanning: true,
							error: null,
							spines: [],
							spineCounts: [],
							edits: {},
							skipped: [],
							requestedPositions: [],
							submitError: null,
						})
					),
					exhaustMap(() =>
						scanEffect
							.identify$(store.photos(), store.media())
							.pipe(
								tapResponse({
									next: (result) =>
										patchState(store, {
											spines: result.spines,
											spineCounts: result.spineCounts,
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
			 * Asks the admin for every kept row the catalog does not hold.
			 * One request per row, in order — the approval that follows hits
			 * the Discogs once each, and a compartment sent in parallel would
			 * spend the minute's budget at once.
			 */
			submit: rxMethod<ShelfRow[]>(
				pipe(
					filter(() => !store.submitting() && !!store.userId()),
					tap(() =>
						patchState(store, {
							submitting: true,
							submitError: null,
						})
					),
					exhaustMap((rows) => {
						const userId = store.userId();

						if (!userId) return EMPTY;

						return from(rows).pipe(
							concatMap((row) =>
								releaseRequestEffect
									.request$(toShelfRequest(row, userId))
									.pipe(
										tap(() =>
											patchState(store, {
												requestedPositions: [
													...store.requestedPositions(),
													row.position,
												],
											})
										)
									)
							),
							toArray(),
							tapResponse({
								next: () =>
									patchState(store, { submitting: false }),
								error: (error) => {
									console.error(error);
									patchState(store, {
										submitting: false,
										submitError: describeError(error),
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
							() => albumStateService.dispatchListEntitiesAction()
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

			loadOwnedItems: rxMethod<void>(
				pipe(
					switchMap(() =>
						collectionItemStateService.selectLoadedEntities$()
					),
					tapResponse({
						next: (ownedItems) => patchState(store, { ownedItems }),
						error: (error) => console.error(error),
					})
				)
			),

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

			login(): void {
				authenticationStateService.dispatchLogin();
			},
		})
	),
	withMethods((store, scanEffect = inject(ShelfScanEffect)) => ({
		/** Scales the picked file and keeps it; the scan starts separately. */
		addPhoto: rxMethod<Blob>(
			pipe(
				filter(
					() =>
						!store.scanning() &&
						store.photos().length < MAX_SHELF_PHOTOS
				),
				tap(() => patchState(store, { error: null })),
				switchMap((file) =>
					from(scanEffect.prepare(file)).pipe(
						tapResponse({
							next: (photo) =>
								patchState(store, {
									photos: [...store.photos(), photo],
								}),
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

		removePhoto(index: number): void {
			const photos = store.photos();
			const removed = photos[index];

			if (removed) {
				URL.revokeObjectURL(removed.previewUrl);
			}
			patchState(store, {
				photos: photos.filter((_, at) => at !== index),
			});
		},

		setMedia(media: PhotoMedia | null): void {
			patchState(store, { media });
		},

		/** A corrected field on one row. */
		edit(position: number, field: SpineField, value: string): void {
			const trimmed = value.trim();
			const edit: SpineEdit =
				field === 'year'
					? { year: Number(trimmed) || null }
					: { [field]: trimmed || null };

			patchState(store, {
				edits: {
					...store.edits(),
					[position]: { ...(store.edits()[position] ?? {}), ...edit },
				},
			});
		},

		/** Takes the other photo's reading for a field in dispute. */
		takeAlternative(position: number, field: SpineField): void {
			const spine = store
				.spines()
				.find((item) => item.position === position);
			const value = spine?.alternatives[field];

			if (value === undefined) return;

			patchState(store, {
				edits: {
					...store.edits(),
					[position]: {
						...(store.edits()[position] ?? {}),
						[field]: value,
					},
				},
			});
		},

		toggleSkipped(position: number): void {
			const skipped = store.skipped();

			patchState(store, {
				skipped: skipped.includes(position)
					? skipped.filter((item) => item !== position)
					: [...skipped, position],
			});
		},

		/** Back to the empty state, ready for the next compartment. */
		reset(): void {
			store
				.photos()
				.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
			patchState(store, {
				photos: [],
				spines: [],
				spineCounts: [],
				edits: {},
				skipped: [],
				requestedPositions: [],
				scanned: false,
				error: null,
				submitError: null,
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
