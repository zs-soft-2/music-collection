import {
	Observable,
	combineLatest,
	exhaustMap,
	filter,
	from,
	map,
	of,
	pairwise,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { DestroyRef, Signal, computed, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistStateService,
	AuthenticationStateService,
	COLLECTION_ITEM_DISPOSAL_REASONS,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	ContributionEntity,
	DiscogsVersion,
	EntityTypeEnum,
	ReleaseEntity,
	ReleaseRequest,
	ReleaseStateService,
	RoleNames,
	ScanCandidate,
	TrackEntity,
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemPermissionsService,
	WishlistItemStateService,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	WritableStateSource,
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { NgxPermissionsService } from 'ngx-permissions';

import {
	MusicCollectionEffect,
	MusicCollectionStanding,
} from '@music-collection/domain/music-collection/core';

import { AlbumDetailsEffect } from '../../data/album-details';
import { UserSettingsEffect } from '../../data/user-settings';
import { PhotoScanEffect, PreparedPhoto } from '../../data/photo-scan';
import { ReleaseRequestEffect } from '../../data/release-request';
import {
	ArtistView,
	ReleaseView,
	toArtistView,
	toDiscography,
	toReleaseView,
} from '../../shared/music-ui';
import { Crumb } from '../../shared/page-breadcrumb';
import { withPageOrigin } from '../../shared/page-origin';
import { ALBUM_VIEW_SETTING } from './album-view.setting';
import {
	DisposalDraft,
	groupCredits,
	ReleaseRequestDraft,
	WishlistDraft,
	groupTracks,
	toAlbumCollections,
	toAlbumProfile,
	toDiscogsVersionViews,
	toPendingRequestView,
	toPhotoVersionViews,
	toPastCopyView,
	toReleaseOptions,
	totalDuration,
} from './album.mapper';
import {
	PlayRequest,
	PlayerStore,
	albumPlayRequest,
} from '../../shared/player';

interface AlbumPageState {
	albumId: string | null;
	/** Sections collapsed, so the whole album fits on one screen. */
	compact: boolean;
	albums: AlbumEntity[];
	artists: ArtistView[];
	releases: ReleaseView[];
	/** The collection items behind `releases`. */
	ownedItems: CollectionItemEntity[];
	/** The collector's copies gone from the collection (all albums). */
	pastItems: CollectionItemEntity[];
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
	/** Every release of the catalog; loaded when the picker first opens. */
	catalogReleases: ReleaseEntity[];
	catalogReleasesLoading: boolean;
	/** The signed-in user, who may add to their collection. */
	userId: string | null;
	userName: string | null;
	canCollect: boolean;
	/** May put albums on their own wishlist. */
	canWish: boolean;
	/** The signed-in user's wanted albums (all albums). */
	wishlistItems: WishlistItemEntity[];
	wishlistOpen: boolean;
	wishing: boolean;
	wishError: string | null;
	/** May mark their copies sold, traded… and take them back. */
	canManageCopies: boolean;
	/** The copy the removal dialog is open for. */
	removingCopyId: string | null;
	disposing: boolean;
	disposeError: string | null;
	pickerOpen: boolean;
	/**
	 * A photo scan sends the collector here with the pressing it recognised:
	 * the picker opens on it, and they confirm.
	 */
	pickedReleaseUid: string | null;
	pickedDiscogsReleaseId: number | null;
	adding: boolean;
	addError: string | null;
	/** The signed-in user's release requests (all albums). */
	requests: ReleaseRequest[];
	/** Discogs pressings of the master `discogsVersionsFor`. */
	discogsVersions: DiscogsVersion[];
	discogsVersionsFor: number | null;
	discogsLoading: boolean;
	discogsError: string | null;
	requesting: boolean;
	requestError: string | null;
	/**
	 * Identifying the pressing from a photo of it. The album is known here,
	 * so only the pressing is in question — which is exactly the part the
	 * catalog and the Discogs list cannot always answer.
	 */
	photoScanning: boolean;
	photoError: string | null;
	photoCandidates: ScanCandidate[];
	/**
	 * The photo as it was sent. Kept so a failed scan can be retried with
	 * the same picture — an overloaded reader is no reason to make the
	 * collector photograph the record again.
	 */
	photo: PreparedPhoto | null;
	/** A photo was scanned — tells "nothing found" from "not tried". */
	photoScanned: boolean;
	/** The published collections, to say what this album is part of. */
	collectionStandings: MusicCollectionStanding[];
	albumsLoading: boolean;
	releasesLoading: boolean;
	detailsLoading: boolean;
	detailsFailed: boolean;
}

const initialState: AlbumPageState = {
	albumId: null,
	compact: false,
	albums: [],
	artists: [],
	releases: [],
	ownedItems: [],
	pastItems: [],
	tracks: [],
	contributions: [],
	catalogReleases: [],
	catalogReleasesLoading: true,
	userId: null,
	userName: null,
	canCollect: false,
	canWish: false,
	wishlistItems: [],
	wishlistOpen: false,
	wishing: false,
	wishError: null,
	canManageCopies: false,
	removingCopyId: null,
	disposing: false,
	disposeError: null,
	pickerOpen: false,
	pickedReleaseUid: null,
	pickedDiscogsReleaseId: null,
	adding: false,
	addError: null,
	requests: [],
	discogsVersions: [],
	discogsVersionsFor: null,
	discogsLoading: false,
	discogsError: null,
	requesting: false,
	requestError: null,
	photoScanning: false,
	photoError: null,
	photoCandidates: [],
	photo: null,
	photoScanned: false,
	collectionStandings: [],
	albumsLoading: true,
	releasesLoading: true,
	detailsLoading: true,
	detailsFailed: false,
};

const MORE_ALBUMS_COUNT = 6;

const DISPOSAL_NOTE_MAX_LENGTH = 500;

/** A removal the rules accept: a known reason, a past date, a short note. */
function isValidDisposal(draft: DisposalDraft): boolean {
	return (
		COLLECTION_ITEM_DISPOSAL_REASONS.includes(draft.reason) &&
		Number.isFinite(draft.date) &&
		draft.date <= Date.now() &&
		(draft.note?.length ?? 0) <= DISPOSAL_NOTE_MAX_LENGTH
	);
}

/** A release is collected once: a copy of it is already owned. */
function ownsRelease(
	ownedItems: CollectionItemEntity[],
	releaseId: string | undefined
): boolean {
	return (
		!!releaseId &&
		ownedItems.some((item) => item.release?.uid === releaseId)
	);
}

/** What the collector reads when a request or a Discogs lookup fails. */
function describeError(error: unknown): string {
	const code = (error as { code?: string })?.code ?? '';

	if (code.endsWith('resource-exhausted')) {
		return 'Discogs is busy right now. Try again in a minute.';
	}
	if (code.endsWith('not-found')) {
		return 'This album was not found on Discogs.';
	}
	if (code.endsWith('permission-denied')) {
		return 'You are not allowed to do this.';
	}
	if (code.endsWith('unavailable')) {
		return 'Discogs cannot be reached right now.';
	}
	return 'Something went wrong. Try again later.';
}

/**
 * What the collector reads when the photo scan fails. The source matters: a
 * busy photo reader is not an unreachable Discogs, and only one of the two
 * is worth retrying with the same picture.
 */
function describeScanError(error: unknown): string {
	const { code = '', details } = (error ?? {}) as {
		code?: string;
		details?: { source?: string };
	};

	if (details?.source === 'vision') {
		return code.endsWith('resource-exhausted')
			? 'The photo reader is busy right now. Try again in a moment.'
			: 'This photo could not be read. Try another one, or describe the pressing.';
	}

	return describeError(error);
}

type PhotoState = { photo: PreparedPhoto | null };
type PhotoHolder = WritableStateSource<PhotoState> & {
	photo: Signal<PreparedPhoto | null>;
};

/** A new picture, or `'again'`: the one already taken, sent once more. */
type PhotoScanInput = Blob | 'again';

/**
 * Holds on to the photo being scanned, releasing the preview of the one
 * before it — an object URL lives until it is revoked, and a collector who
 * photographs a shelf-full of records would leak one per record.
 */
function keepPhoto(store: PhotoHolder, photo: PreparedPhoto | null): void {
	const previous = store.photo();

	if (previous && previous !== photo) {
		URL.revokeObjectURL(previous.previewUrl);
	}

	patchState(store, { photo });
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

export const AlbumPageStore = signalStore(
	withState(initialState),
	withPageOrigin(),
	withComputed((store) => {
		const albumEntity = computed(
			() =>
				store.albums().find((album) => album.uid === store.albumId()) ??
				null
		);
		const album = computed(() => {
			const entity = albumEntity();
			return entity ? toAlbumProfile(entity) : null;
		});

		return {
			album,
			/**
			 * Where this album was opened from › this album: the collection
			 * it was picked out of when it was, My Collection › the artist
			 * (when known) otherwise.
			 */
			trail: computed<Crumb[]>(() => {
				const profile = album();
				const origin = store.originTrail();

				return [
					...(origin.length
						? origin
						: [
								{
									label: 'My Collection',
									link: '/collection',
								},
								...(profile?.artistId
									? [
											{
												label: profile.artistName,
												link: [
													'/artist',
													profile.artistId,
												],
											},
										]
									: []),
							]),
					...(profile ? [{ label: profile.title }] : []),
				];
			}),
			/** The collections this record is part of, nearest to complete. */
			collections: computed(() =>
				toAlbumCollections(
					store.collectionStandings(),
					store.albumId() ?? ''
				)
			),
			artist: computed(
				() =>
					store
						.artists()
						.find((artist) => artist.id === album()?.artistId) ??
					null
			),
			/** The collector's copies of this album. */
			copies: computed(() =>
				store
					.releases()
					.filter((release) => release.albumId === store.albumId())
			),
			/** The copy the removal dialog is open for. */
			removingCopy: computed(
				() =>
					store
						.releases()
						.find(
							(release) => release.id === store.removingCopyId()
						) ?? null
			),
			/** The collector's copies of this album gone from the collection. */
			pastCopies: computed(() =>
				store
					.pastItems()
					.map(toPastCopyView)
					.filter((copy) => copy.albumId === store.albumId())
			),
			/** The album's catalog releases to pick the collected one from. */
			releaseOptions: computed(() => {
				const albumId = store.albumId();
				const owned = new Set(
					store
						.releases()
						.filter((release) => release.albumId === albumId)
						.flatMap((release) =>
							release.releaseId ? [release.releaseId] : []
						)
				);

				return toReleaseOptions(
					store
						.catalogReleases()
						.filter((release) => release.album?.uid === albumId),
					owned
				);
			}),
			trackGroups: computed(() =>
				groupTracks(store.tracks(), store.contributions())
			),
			totalDuration: computed(() => totalDuration(store.tracks())),
			creditGroups: computed(() => groupCredits(store.contributions())),
			/** Other albums of the same artist, nearest release years first. */
			moreAlbums: computed(() => {
				const current = album();
				if (!current) {
					return [];
				}
				const others = store
					.albums()
					.filter(
						(other) =>
							other.artist?.uid === current.artistId &&
							other.uid !== current.id
					)
					.map((other) => toAlbumProfile(other));

				return toDiscography(others, store.releases())
					.sort(
						(a, b) =>
							Math.abs((a.year ?? 0) - (current.year ?? 0)) -
							Math.abs((b.year ?? 0) - (current.year ?? 0))
					)
					.slice(0, MORE_ALBUMS_COUNT)
					.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
			}),
			/** This album on the signed-in user's wishlist, still wanted. */
			wanted: computed(() => {
				const userId = store.userId();
				const albumId = store.albumId();

				return (
					store
						.wishlistItems()
						.find(
							(item) =>
								item.userReference?.uid === userId &&
								item.albumReference?.uid === albumId &&
								item.isActive !== false
						) ?? null
				);
			}),
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
				const requested = new Set(
					store
						.requests()
						.filter((request) => request.status === 'pending')
						.flatMap((request) =>
							request.discogsReleaseId
								? [request.discogsReleaseId]
								: []
						)
				);
				return toDiscogsVersionViews(
					store.discogsVersions(),
					requested
				);
			}),
			/** The pressings a photo found, as picker options. */
			photoOptions: computed(() => {
				const requested = new Set(
					store
						.requests()
						.filter((request) => request.status === 'pending')
						.flatMap((request) =>
							request.discogsReleaseId
								? [request.discogsReleaseId]
								: []
						)
				);

				return toPhotoVersionViews(store.photoCandidates(), requested);
			}),
			/** The photo being scanned, to show it while it is read. */
			photoPreviewUrl: computed(() => store.photo()?.previewUrl ?? null),
			notFound: computed(
				() =>
					!store.albumsLoading() &&
					!albumEntity() &&
					store.albums().length > 0
			),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			albumStateService = inject(AlbumStateService),
			artistStateService = inject(ArtistStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			wishlistItemStateService = inject(WishlistItemStateService),
			releaseStateService = inject(ReleaseStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			releaseRequestEffect = inject(ReleaseRequestEffect),
			photoScanEffect = inject(PhotoScanEffect),
			musicCollectionEffect = inject(MusicCollectionEffect)
		) => ({
			/** The signed-in user's release requests; follows sign-in. */
			loadRequests: rxMethod<void>(
				pipe(
					switchMap(() =>
						authenticationStateService.selectAuthenticatedUser$()
					),
					map((user) => user?.uid ?? ''),
					switchMap((userId) =>
						userId
							? releaseRequestEffect.listByUser$(userId)
							: of([])
					),
					tapResponse({
						next: (requests) => patchState(store, { requests }),
						error: (error) => console.error(error),
					})
				)
			),
			/** The Discogs pressings of the album's master, once per master. */
			loadDiscogsVersions: rxMethod<number>(
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
											discogsError: describeError(error),
										});
									},
								})
							)
					)
				)
			),
			/**
			 * Identifies the pressing from a photo of the record. The album
			 * is known here, so the search starts from it: the photo only has
			 * to give up the catalogue number or the barcode, which is what
			 * tells two pressings of the same album apart.
			 */
			scanPressingPhoto: rxMethod<PhotoScanInput>(
				pipe(
					filter(
						(input) =>
							!store.photoScanning() &&
							(input !== 'again' || !!store.photo())
					),
					tap(() =>
						patchState(store, {
							photoScanning: true,
							photoError: null,
							photoCandidates: [],
						})
					),
					switchMap((input) =>
						from(
							input === 'again'
								? Promise.resolve(
										store.photo() as PreparedPhoto
									)
								: photoScanEffect.prepare(input).catch(() => {
										// A format the browser cannot decode
										// (an untouched iPhone HEIC, say)
										// fails here, not at the lookup — say
										// so instead of blaming the server.
										throw new Error('unreadable-photo');
									})
						).pipe(
							tap((photo) => keepPhoto(store, photo)),
							switchMap((photo) => {
								const album = store.album();

								return photoScanEffect.identify$(
									photo,
									album
										? {
												name: album.title,
												artistName: album.artistName,
											}
										: null
								);
							}),
							tapResponse({
								next: (result) =>
									patchState(store, {
										photoCandidates: result.candidates,
										photoScanning: false,
										photoScanned: true,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										photoScanning: false,
										photoScanned: true,
										photoError:
											(error as Error)?.message ===
											'unreadable-photo'
												? 'This image could not be read. Try a JPEG or PNG — an iPhone photo may need to be shared as a picture first.'
												: describeScanError(error),
									});
								},
							})
						)
					)
				)
			),

			/** Sends the request to the admin; the picker closes when sent. */
			requestRelease: rxMethod<ReleaseRequestDraft>(
				pipe(
					filter(() => !store.requesting()),
					map((draft) => {
						const album = store
							.albums()
							.find((item) => item.uid === store.albumId());
						const userId = store.userId();

						return album && userId
							? releaseRequestEffect.request$({
									userId,
									album: {
										uid: album.uid,
										name: album.name,
										artistUid: album.artist?.uid ?? null,
										artistName: album.artist?.name ?? null,
									},
									status: 'pending',
									discogsMasterId:
										album.discogs?.masterId ?? null,
									discogsReleaseId: draft.discogsReleaseId,
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
										requestError: describeError(error),
									});
								},
							})
						)
					)
				)
			),
			/** Follows `:albumId` and loads the tracklist and credits. */
			loadDetails: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('albumId') ?? ''),
					tap((albumId) =>
						patchState(store, {
							albumId,
							tracks: [],
							contributions: [],
							detailsLoading: true,
							detailsFailed: false,
						})
					),
					switchMap((albumId) =>
						albumDetailsEffect.load$(albumId).pipe(
							tapResponse({
								next: ({ tracks, contributions }) =>
									patchState(store, {
										tracks,
										contributions,
										detailsLoading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										detailsLoading: false,
										detailsFailed: true,
									});
								},
							})
						)
					)
				)
			),
			/**
			 * Which collections ask for this album. Nothing is stored: the
			 * standings are resolved from the catalog and the shelf, so the
			 * answer follows both.
			 */
			loadCollections: rxMethod<void>(
				pipe(
					switchMap(() => musicCollectionEffect.listStandings$()),
					tapResponse({
						next: (
							collectionStandings: MusicCollectionStanding[]
						) => patchState(store, { collectionStandings }),
						error: (error) => console.error(error),
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
						next: (albums) =>
							patchState(store, { albums, albumsLoading: false }),
						error: (error) => {
							console.error(error);
							patchState(store, { albumsLoading: false });
						},
					})
				)
			),
			loadArtists: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => artistStateService.selectEntities$(),
							() =>
								artistStateService.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (artists) =>
							patchState(store, {
								artists: artists.map(toArtistView),
							}),
						error: (error) => console.error(error),
					})
				)
			),
			/** Who is signed in and whether they may add to their collection. */
			loadCollector: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							authenticationStateService.selectAuthenticatedUser$(),
							permissionsService.permissions$,
						])
					),
					tap(([user, permissions]) =>
						patchState(store, {
							userId: user?.uid ?? null,
							userName: user?.displayName ?? null,
							canWish:
								!!user?.uid &&
								(WishlistItemPermissionsService.createWishlistItemEntity in
									permissions ||
									RoleNames.ADMIN in permissions),
							canCollect:
								!!user?.uid &&
								(CollectionItemPermissionsService.createCollectionItemEntity in
									permissions ||
									RoleNames.ADMIN in permissions),
							canManageCopies:
								!!user?.uid &&
								(CollectionItemPermissionsService.updateCollectionItemEntity in
									permissions ||
									RoleNames.ADMIN in permissions),
						})
					)
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
						next: (catalogReleases) =>
							patchState(store, {
								catalogReleases,
								catalogReleasesLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								catalogReleasesLoading: false,
							});
						},
					})
				)
			),
			/** Follows the add; the picker closes once the copy is saved. */
			watchAdding: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							collectionItemStateService.selectAdding$(),
							collectionItemStateService.selectError$(),
						])
					),
					pairwise(),
					tap(([[wasAdding], [adding, error]]) => {
						patchState(store, { adding });
						if (wasAdding && !adding) {
							patchState(store, {
								addError: error,
								pickerOpen: !!error,
							});
						}
					})
				)
			),
			/** Follows a removal or restore; the dialog closes once saved. */
			watchDisposing: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							collectionItemStateService.selectDisposing$(),
							collectionItemStateService.selectError$(),
						])
					),
					pairwise(),
					tap(([[wasDisposing], [disposing, error]]) => {
						patchState(store, { disposing });
						if (wasDisposing && !disposing) {
							patchState(store, {
								disposeError: error,
								removingCopyId: error
									? store.removingCopyId()
									: null,
							});
						}
					})
				)
			),
			/** Marks the copy sold, traded… It stays in the history. */
			removeCopy(draft: DisposalDraft): void {
				const item = store
					.ownedItems()
					.find((owned) => owned.uid === store.removingCopyId());

				if (
					!item ||
					!store.canManageCopies() ||
					store.disposing() ||
					!isValidDisposal(draft)
				) {
					return;
				}

				patchState(store, { disposeError: null });
				collectionItemStateService.dispatchDisposeEntityAction(item, {
					reason: draft.reason,
					date: draft.date,
					note: draft.note?.trim() || null,
				});
			},
			/** Takes a copy gone from the collection back into it. */
			restoreCopy(copyId: string): void {
				const item = store
					.pastItems()
					.find((past) => past.uid === copyId);

				if (
					item &&
					store.canManageCopies() &&
					!store.disposing() &&
					!ownsRelease(store.ownedItems(), item.release?.uid)
				) {
					collectionItemStateService.dispatchRestoreEntityAction(
						item
					);
				}
			},
			loadPastItems: rxMethod<void>(
				pipe(
					switchMap(() =>
						collectionItemStateService.selectLoadedDisposedEntities$()
					),
					tapResponse({
						next: (pastItems) => patchState(store, { pastItems }),
						error: (error) => console.error(error),
					})
				)
			),
			/**
			 * Adds a copy of the release to the signed-in user's collection,
			 * unless it is already in it (an approved release request adds it
			 * on its own).
			 */
			addToCollection(releaseId: string): void {
				const release = store
					.catalogReleases()
					.find((item) => item.uid === releaseId);
				const userId = store.userId();

				if (!release || !userId || store.adding()) {
					return;
				}
				if (ownsRelease(store.ownedItems(), releaseId)) {
					patchState(store, {
						addError: 'This release is already in your collection.',
					});
					return;
				}

				const collectionItem: CollectionItemEntityAdd = {
					entityType: EntityTypeEnum.CollectionItem,
					date: new Date(),
					release,
					userId,
				};

				patchState(store, { addError: null });
				collectionItemStateService.dispatchAddEntityAction(
					collectionItem
				);
			},
			/** The signed-in user's wanted albums; follows sign-in. */
			loadWishlist: rxMethod<void>(
				pipe(
					tap(() =>
						wishlistItemStateService.dispatchListOwnEntitiesAction()
					),
					switchMap(() => wishlistItemStateService.selectEntities$()),
					tapResponse({
						next: (wishlistItems) =>
							patchState(store, { wishlistItems }),
						error: (error) => console.error(error),
					})
				)
			),
			/** Follows the add; the dialog closes once the album is wanted. */
			watchWishing: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							wishlistItemStateService.selectAdding$(),
							wishlistItemStateService.selectError$(),
						])
					),
					pairwise(),
					tap(([[wasWishing], [wishing, error]]) => {
						patchState(store, { wishing });
						if (wasWishing && !wishing) {
							patchState(store, {
								wishError: error,
								wishlistOpen: !!error,
							});
						}
					})
				)
			),
			/**
			 * Puts the album on the signed-in user's wishlist, unless it is
			 * already wanted.
			 */
			addToWishlist(draft: WishlistDraft): void {
				const album = store
					.albums()
					.find((item) => item.uid === store.albumId());
				const userId = store.userId();

				if (!album || !userId || !store.canWish() || store.wishing()) {
					return;
				}
				if (
					store
						.wishlistItems()
						.some(
							(item) =>
								item.userReference?.uid === userId &&
								item.albumReference?.uid === album.uid &&
								item.isActive !== false
						)
				) {
					patchState(store, {
						wishError: 'This album is already on your wishlist.',
					});
					return;
				}

				const wishlistItem: WishlistItemEntityAdd = {
					entityType: EntityTypeEnum.WishlistItem,
					albumReference: {
						coverImage: album.coverImage ?? null,
						name: album.name,
						uid: album.uid,
					},
					artistReference: {
						name: album.artist?.name ?? '',
						uid: album.artist?.uid ?? '',
					},
					userReference: {
						displayName: store.userName(),
						uid: userId,
					},
					medias: draft.medias,
					sourceLink: draft.sourceLink ?? '',
					isActive: true,
				};

				patchState(store, { wishError: null });
				wishlistItemStateService.dispatchAddEntityAction(wishlistItem);
			},
			loadReleases: rxMethod<void>(
				pipe(
					switchMap(() =>
						collectionItemStateService.selectLoadedEntities$()
					),
					tapResponse({
						next: (items) =>
							patchState(store, {
								ownedItems: items,
								releases: items.map(toReleaseView),
								releasesLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { releasesLoading: false });
						},
					})
				)
			),
		})
	),
	withComputed((store) => ({
		/** Where the picker opens: a scan may point at a Discogs pressing. */
		pickerView: computed((): 'catalog' | 'discogs' =>
			store.pickedDiscogsReleaseId() ? 'discogs' : 'catalog'
		),
	})),
	withMethods((store, settingsEffect = inject(UserSettingsEffect)) => {
		let catalogRequested = false;

		return {
			openPicker(): void {
				if (!catalogRequested) {
					catalogRequested = true;
					store.loadCatalogReleases(of(undefined));
				}
				patchState(store, {
					pickerOpen: true,
					addError: null,
					requestError: null,
				});
			},
			/** Looks up the album's pressings on Discogs. */
			showDiscogsVersions(): void {
				const masterId = store.discogsMasterId();
				if (masterId) {
					store.loadDiscogsVersions(masterId);
				}
			},
			closePicker(): void {
				keepPhoto(store, null);
				patchState(store, {
					pickerOpen: false,
					pickedReleaseUid: null,
					pickedDiscogsReleaseId: null,
					// The next record gets its own photo, not this one's.
					photoCandidates: [],
					photoScanned: false,
					photoError: null,
				});
			},
			openWishlist(): void {
				patchState(store, { wishlistOpen: true, wishError: null });
			},
			closeWishlist(): void {
				patchState(store, { wishlistOpen: false });
			},
			openRemoval(copyId: string): void {
				patchState(store, {
					removingCopyId: copyId,
					disposeError: null,
				});
			},
			closeRemoval(): void {
				patchState(store, { removingCopyId: null });
			},

			/** The layout kept for the user, and any later change to it. */
			loadView: rxMethod<void>(
				pipe(
					switchMap(() => settingsEffect.value$(ALBUM_VIEW_SETTING)),
					tap(({ compact }) => {
						if (compact !== null) {
							patchState(store, { compact });
						}
					})
				)
			),

			/** Collapses the sections, or opens them again, for good. */
			toggleCompact(): void {
				const compact = !store.compact();

				patchState(store, { compact });
				settingsEffect
					.save(ALBUM_VIEW_SETTING, { compact })
					.catch((error) => {
						console.error('Album view not saved', error);
					});
			},
		};
	}),
	withMethods((store, route = inject(ActivatedRoute)) => ({
		/**
		 * A photo scan links here with `?pick=`: the picker opens on what it
		 * recognised — a catalog release to add, or a Discogs pressing to
		 * request. The collector still confirms; the link only saves them
		 * finding it in the list.
		 */
		followScanPick: rxMethod<void>(
			pipe(
				switchMap(() => route.queryParamMap),
				map((params) => params.get('pick')),
				filter((pick): pick is string => !!pick),
				tap((pick) => {
					const [kind, value] = pick.split(':');
					const discogsReleaseId =
						kind === 'discogs' ? Number(value) : NaN;

					patchState(store, {
						pickedReleaseUid: kind === 'release' ? value : null,
						pickedDiscogsReleaseId: Number.isSafeInteger(
							discogsReleaseId
						)
							? discogsReleaseId
							: null,
					});
					store.openPicker();

					if (kind === 'discogs') {
						store.showDiscogsVersions();
					}
				})
			)
		),
	})),
	withComputed((store, player = inject(PlayerStore)) => ({
		/** Our id of the album's track playing now. */
		playingTrackId: computed(() => {
			const now = player.now();
			return now?.albumId === store.albumId() ? now.trackId : null;
		}),
		/** The album plays now. */
		playing: computed(() => player.pagePlaying()),
		playable: computed(() => player.pagePlayable()),
	})),
	withMethods((store, player = inject(PlayerStore)) => ({
		/** Plays the album, or pauses / resumes it. */
		togglePlay(): Promise<void> {
			return player.togglePage();
		},
		playTrack(trackId: string): Promise<void> {
			return player.playPageTrack(trackId);
		},
		openPlayer(): void {
			player.openStage();
		},
	})),
	withHooks({
		onInit(store, player = inject(PlayerStore)) {
			// The player gets ready for the album shown.
			let page: PlayRequest | null = null;
			effect(() => {
				const album = store
					.albums()
					.find((item) => item.uid === store.albumId());
				page = album ? albumPlayRequest(album, store.tracks()) : null;
				player.setPage(page);
			});
			inject(DestroyRef).onDestroy(() => player.clearPage(page));

			store.followScanPick(of(undefined));
			store.loadOrigin(of(undefined));
			store.loadView(of(undefined));
			store.loadDetails(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadArtists(of(undefined));
			store.loadReleases(of(undefined));
			store.loadCollector(of(undefined));
			store.watchAdding(of(undefined));
			store.watchDisposing(of(undefined));
			store.loadPastItems(of(undefined));
			store.loadRequests(of(undefined));
			store.loadWishlist(of(undefined));
			store.loadCollections(of(undefined));
			store.watchWishing(of(undefined));
		},
	})
);
