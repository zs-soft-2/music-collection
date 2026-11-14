import { combineLatest, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { TextService } from '@music-collection/core/i18n';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistStateService,
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	ContributionEntity,
	RoleNames,
	TrackEntity,
	WishlistItemPermissionsService,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	signalStoreFeature,
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
import { PlayLogEffect, PlayLogEntry, listeningFor } from '../../data/play-log';
import {
	ArtistView,
	ReleaseView,
	toArtistView,
	toDiscography,
	toReleaseView,
} from '../../shared/music-ui';
import { Crumb, pageTrail } from '../../shared/page-breadcrumb';
import { withCopyDisposal } from '../../shared/copy-disposal/copy-disposal.feature';
import { DisposalDraft } from '../../shared/music-ui/copy-removal/copy-removal.model';
import { withPageOrigin } from '../../shared/page-origin';
import {
	groupCredits,
	groupTracks,
	toAlbumCollections,
	toAlbumProfile,
	toPastCopyView,
	totalDuration,
} from './album.mapper';
import {
	albumOf,
	entities$,
	keepPhoto,
	ownsRelease,
} from './store/album-page.helpers';
import { withAlbumCopyAdding } from './store/album-copy-adding.feature';
import { withAlbumPhotoScan } from './store/album-photo-scan.feature';
import { withAlbumPlacement } from './store/album-placement.feature';
import { withAlbumPlayer } from './store/album-player.feature';
import { withAlbumRating } from './store/album-rating.feature';
import { withAlbumReleaseRequest } from './store/album-release-request.feature';
import { withAlbumView } from './store/album-view.feature';
import { withAlbumWishlist } from './store/album-wishlist.feature';

/*
 * The album page. `withAlbumPage` holds the album, its catalog neighbours
 * and the collector; each thing the page lets the collector do with the
 * record lives in its own feature under `./store`:
 *
 * - withAlbumView            the compact layout, kept with the settings
 * - withAlbumReleaseRequest  Discogs pressings and release requests
 * - withAlbumPhotoScan       telling the pressing from a photo
 * - withAlbumCopyAdding      adding a copy from the picker
 * - withAlbumWishlist        wanting the album
 * - withAlbumPlacement       filing a copy into the drawn furniture
 * - withAlbumRating          the collector's stars and the community's
 * - withAlbumPlayer          the page's side of the app's one player
 *
 * The order matters: a feature can only read what is declared before it,
 * and a computed named like a feature's state field is silently dropped —
 * so a new name is checked against every feature's state first.
 *
 * `signalStore` is typed for at most 15 features; past that, or when the
 * overloads cannot infer the chain, the store type widens to an index
 * signature without a word. `tsc -p tsconfig.app.json` shows it, jest does
 * not.
 */

interface AlbumPageState {
	albumId: string | null;
	albums: AlbumEntity[];
	artists: ArtistView[];
	releases: ReleaseView[];
	/** The collection items behind `releases`. */
	ownedItems: CollectionItemEntity[];
	/** The collector's copies gone from the collection (all albums). */
	pastItems: CollectionItemEntity[];
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
	/** The signed-in user, who may add to their collection. */
	userId: string | null;
	userName: string | null;
	canCollect: boolean;
	/** May put albums on their own wishlist. */
	canWish: boolean;
	pickerOpen: boolean;
	/**
	 * A photo scan sends the collector here with the pressing it recognised:
	 * the picker opens on it, and they confirm.
	 */
	pickedReleaseUid: string | null;
	pickedDiscogsReleaseId: number | null;
	/** The published collections, to say what this album is part of. */
	collectionStandings: MusicCollectionStanding[];
	/** The collector's own listening log; empty while signed out. */
	playLog: PlayLogEntry[];
	albumsLoading: boolean;
	releasesLoading: boolean;
	detailsLoading: boolean;
	detailsFailed: boolean;
}

const initialState: AlbumPageState = {
	albumId: null,
	albums: [],
	artists: [],
	releases: [],
	ownedItems: [],
	pastItems: [],
	tracks: [],
	contributions: [],
	userId: null,
	userName: null,
	canCollect: false,
	canWish: false,
	pickerOpen: false,
	pickedReleaseUid: null,
	pickedDiscogsReleaseId: null,
	collectionStandings: [],
	playLog: [],
	albumsLoading: true,
	releasesLoading: true,
	detailsLoading: true,
	detailsFailed: false,
};

const MORE_ALBUMS_COUNT = 6;

/**
 * The album itself, what surrounds it in the catalog, and how it came to be
 * open. Kept as one feature of its own so that its type is settled before
 * the features that read it: inferred inline, next to features that state
 * what they need, the signalStore overloads lose track of it.
 */
function withAlbumPage() {
	return signalStoreFeature(
		withState(initialState),
		withPageOrigin(),
		withCopyDisposal(),
		withComputed((store, text = inject(TextService)) => {
			const albumEntity = computed(
				() => albumOf(store.albums(), store.albumId()) ?? null
			);
			const album = computed(() => {
				const entity = albumEntity();
				return entity ? toAlbumProfile(entity) : null;
			});

			return {
				album,
				/**
				 * Home › the band › this album. The record is the band's, and
				 * that is true of it wherever it was opened from; where the
				 * reader came from is the Back control's business.
				 */
				trail: computed<Crumb[]>(() => {
					const profile = album();

					return pageTrail(text.translator(), [
						profile?.artistId
							? {
									label: profile.artistName,
									link: ['/artist', profile.artistId],
								}
							: null,
						profile ? { label: profile.title } : null,
					]);
				}),
				/** The collection this album was opened from, for the way back. */
				backLabel: computed(() => store.originName()),
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
							.find(
								(artist) => artist.id === album()?.artistId
							) ?? null
				),
				/** The collector's copies of this album. */
				copies: computed(() =>
					store
						.releases()
						.filter(
							(release) => release.albumId === store.albumId()
						)
				),
				/** The copy the removal dialog is open for. */
				removingCopy: computed(
					() =>
						store
							.releases()
							.find(
								(release) =>
									release.id === store.removingCopyId()
							) ?? null
				),
				/** The collector's copies of this album gone from the collection. */
				pastCopies: computed(() =>
					store
						.pastItems()
						.map(toPastCopyView)
						.filter((copy) => copy.albumId === store.albumId())
				),
				trackGroups: computed(() =>
					groupTracks(store.tracks(), store.contributions())
				),
				totalDuration: computed(() => totalDuration(store.tracks())),
				creditGroups: computed(() =>
					groupCredits(store.contributions())
				),
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
				notFound: computed(
					() =>
						!store.albumsLoading() &&
						!albumEntity() &&
						store.albums().length > 0
				),
				/** Where the picker opens: a scan may point at a Discogs pressing. */
				pickerView: computed((): 'catalog' | 'discogs' =>
					store.pickedDiscogsReleaseId() ? 'discogs' : 'catalog'
				),
				/** How often the collector has put this record on. */
				listening: computed(() =>
					listeningFor(store.playLog(), store.albumId())
				),
			};
		})
	);
}

export const AlbumPageStore = signalStore(
	withAlbumPage(),
	withAlbumView(),
	withAlbumReleaseRequest(),
	withAlbumPhotoScan(),
	withAlbumCopyAdding(),
	withAlbumWishlist(),
	withAlbumPlacement(),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			albumStateService = inject(AlbumStateService),
			artistStateService = inject(ArtistStateService),
			collectionItemStateService = inject(CollectionItemStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			musicCollectionEffect = inject(MusicCollectionEffect),
			playLogEffect = inject(PlayLogEffect)
		) => {
			let catalogRequested = false;

			const openPicker = (): void => {
				if (!catalogRequested) {
					catalogRequested = true;
					store.loadCatalogReleases(of(undefined));
				}
				patchState(store, {
					pickerOpen: true,
					addError: null,
					requestError: null,
				});
			};

			const closePicker = (): void => {
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
			};

			return {
				/** The collector's listening, to say how often this record went on. */
				loadPlayLog: rxMethod<void>(
					pipe(
						switchMap(() =>
							playLogEffect.list$().pipe(
								tapResponse({
									next: (playLog: PlayLogEntry[]) =>
										patchState(store, { playLog }),
									error: (error) => console.error(error),
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
						switchMap(() =>
							musicCollectionEffect.listStandings$().pipe(
								tapResponse({
									next: (
										collectionStandings: MusicCollectionStanding[]
									) =>
										patchState(store, {
											collectionStandings,
										}),
									error: (error) => console.error(error),
								})
							)
						)
					)
				),
				loadAlbums: rxMethod<void>(
					pipe(
						switchMap(() =>
							entities$(
								() => albumStateService.selectEntities$(),
								() =>
									albumStateService.dispatchListEntitiesAction()
							).pipe(
								tapResponse({
									next: (albums) =>
										patchState(store, {
											albums,
											albumsLoading: false,
										}),
									error: (error) => {
										console.error(error);
										patchState(store, {
											albumsLoading: false,
										});
									},
								})
							)
						)
					)
				),
				loadArtists: rxMethod<void>(
					pipe(
						switchMap(() =>
							entities$(
								() => artistStateService.selectEntities$(),
								() =>
									artistStateService.dispatchListEntitiesAction()
							).pipe(
								tapResponse({
									next: (artists) =>
										patchState(store, {
											artists: artists.map(toArtistView),
										}),
									error: (error) => console.error(error),
								})
							)
						)
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
							})
						)
					)
				),
				loadReleases: rxMethod<void>(
					pipe(
						switchMap(() =>
							collectionItemStateService
								.selectLoadedEntities$()
								.pipe(
									tapResponse({
										next: (items) =>
											patchState(store, {
												ownedItems: items,
												releases:
													items.map(toReleaseView),
												releasesLoading: false,
											}),
										error: (error) => {
											console.error(error);
											patchState(store, {
												releasesLoading: false,
											});
										},
									})
								)
						)
					)
				),
				loadPastItems: rxMethod<void>(
					pipe(
						switchMap(() =>
							collectionItemStateService
								.selectLoadedDisposedEntities$()
								.pipe(
									tapResponse({
										next: (pastItems) =>
											patchState(store, { pastItems }),
										error: (error) => console.error(error),
									})
								)
						)
					)
				),
				/** Marks the copy sold, traded… It stays in the history. */
				removeCopy(draft: DisposalDraft): void {
					const item = store
						.ownedItems()
						.find((owned) => owned.uid === store.removingCopyId());

					if (item && store.canManageCopies()) {
						store.disposeCopy(item, draft);
					}
				},
				/** Takes a copy gone from the collection back into it. */
				restoreCopy(copyId: string): void {
					const item = store
						.pastItems()
						.find((past) => past.uid === copyId);

					if (
						item &&
						store.canManageCopies() &&
						!ownsRelease(store.ownedItems(), item.release?.uid)
					) {
						store.restoreDisposedCopy(item);
					}
				},
				openPicker,
				closePicker,
				/**
				 * The picker shows a pressing as owned, and the collector
				 * wants that copy gone: the picker closes and the same removal
				 * dialog opens that the copy list on the page offers.
				 */
				removeFromPicker(copyId: string): void {
					if (!store.canManageCopies()) {
						return;
					}
					closePicker();
					store.openRemoval(copyId);
				},
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
								pickedReleaseUid:
									kind === 'release' ? value : null,
								pickedDiscogsReleaseId: Number.isSafeInteger(
									discogsReleaseId
								)
									? discogsReleaseId
									: null,
							});
							openPicker();

							if (kind === 'discogs') {
								store.showDiscogsVersions();
							}
						})
					)
				),
			};
		}
	),
	withAlbumRating(),
	// Its hook goes first, as it did inline: the player is told about the
	// page before anything below starts loading it.
	withAlbumPlayer(),
	withHooks({
		onInit(store) {
			store.followScanPick(of(undefined));
			store.loadOrigin(of(undefined));
			store.loadView(of(undefined));
			store.loadDetails(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadArtists(of(undefined));
			store.loadReleases(of(undefined));
			store.loadCollector(of(undefined));
			store.watchCopyPermission(of(undefined));
			store.watchAdding(of(undefined));
			store.watchDisposing(of(undefined));
			store.watchPlacing(of(undefined));
			store.loadShelfLayout(of(undefined));
			store.loadPastItems(of(undefined));
			store.loadRequests(of(undefined));
			store.loadWishlist(of(undefined));
			store.loadCollections(of(undefined));
			store.loadPlayLog(of(undefined));
			store.loadRatings(of(undefined));
			store.watchRatingSummary(of(undefined));
			store.watchWishing(of(undefined));
		},
	})
);
