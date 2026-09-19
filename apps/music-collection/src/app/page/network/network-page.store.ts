import { Observable, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
	MembershipEntity,
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

import { ArtistNetworkEffect } from '../../data/artist-network';
import {
	AlbumView,
	ArtistView,
	ReleaseView,
	toAlbumView,
	toArtistView,
	toReleaseView,
} from '../../shared/music-ui';
import {
	buildNetwork,
	buildNetworkDetails,
	buildNetworkIndex,
	defaultFocus,
	searchNetwork,
} from './network.mapper';
import { NetworkFilter } from './network.model';

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 4;
const DEFAULT_DEPTH = 2;

export type NetworkFilterFlag = Exclude<
	keyof NetworkFilter,
	'focusId' | 'depth'
>;

interface NetworkPageState {
	/** From the `focus` query parameter; null until chosen. */
	focusId: string | null;
	depth: number;
	selectedId: string | null;
	includeGuests: boolean;
	onlyOwned: boolean;
	query: string;
	memberships: MembershipEntity[];
	artists: ArtistView[];
	albums: (AlbumView & { artistId: string })[];
	releases: ReleaseView[];
	membershipsLoading: boolean;
	artistsLoading: boolean;
}

const initialState: NetworkPageState = {
	focusId: null,
	depth: DEFAULT_DEPTH,
	selectedId: null,
	includeGuests: false,
	onlyOwned: false,
	query: '',
	memberships: [],
	artists: [],
	albums: [],
	releases: [],
	membershipsLoading: true,
	artistsLoading: true,
};

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

function toDepth(value: string | null): number {
	const depth = Number(value);

	return Number.isInteger(depth) && depth >= MIN_DEPTH && depth <= MAX_DEPTH
		? depth
		: DEFAULT_DEPTH;
}

/**
 * Relationship network page: who played with whom, in which bands and
 * projects. Focus and depth live in the URL.
 */
export const NetworkPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const currentYear = new Date().getFullYear();

		const index = computed(() => {
			const releases = store.releases();

			return buildNetworkIndex({
				memberships: store.memberships(),
				artists: store.artists(),
				albums: store.albums(),
				ownedAlbumIds: new Set(releases.map((r) => r.albumId)),
				collectedArtistIds: new Set(releases.map((r) => r.artistId)),
			});
		});

		const effectiveFocusId = computed(
			() => store.focusId() ?? defaultFocus(index())
		);

		const graph = computed(() => {
			const focusId = effectiveFocusId();

			return focusId
				? buildNetwork(
						index(),
						{
							focusId,
							depth: store.depth(),
							includeGuests: store.includeGuests(),
							onlyOwned: store.onlyOwned(),
						},
						currentYear
					)
				: { nodes: [], edges: [], truncated: false };
		});

		/** The selected node, or the focus when nothing is selected. */
		const activeId = computed(
			() => store.selectedId() ?? effectiveFocusId()
		);

		return {
			effectiveFocusId,
			graph,
			activeId,
			focusNode: computed(() => {
				const focusId = effectiveFocusId();

				return focusId ? (index().nodes.get(focusId) ?? null) : null;
			}),
			details: computed(() => {
				const id = activeId();

				return id
					? buildNetworkDetails(index(), graph(), id, currentYear)
					: null;
			}),
			searchResults: computed(() =>
				searchNetwork(index(), store.query())
			),
			loading: computed(
				() => store.membershipsLoading() || store.artistsLoading()
			),
			/** Loaded, but there is nothing to draw around the focus. */
			empty: computed(
				() =>
					!store.membershipsLoading() &&
					!store.artistsLoading() &&
					graph().nodes.length === 0
			),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			router = inject(Router),
			artistNetworkEffect = inject(ArtistNetworkEffect),
			artistStateService = inject(ArtistStateService),
			albumStateService = inject(AlbumStateService),
			collectionItemStateService = inject(CollectionItemStateService)
		) => {
			const navigate = (queryParams: Record<string, string | number>) =>
				router.navigate([], {
					relativeTo: route,
					queryParams,
					queryParamsHandling: 'merge',
				});

			return {
				/** Follows the `focus`, `depth` and `guests` query parameters. */
				followRoute: rxMethod<void>(
					pipe(
						switchMap(() => route.queryParamMap),
						tap((params) => {
							const focusId = params.get('focus');

							patchState(store, {
								focusId,
								depth: toDepth(params.get('depth')),
								// Links may ask for guests, e.g. for a session musician.
								...(params.has('guests')
									? {
											includeGuests:
												params.get('guests') === '1',
										}
									: {}),
								// A new focus starts with its own details.
								...(focusId !== store.focusId()
									? { selectedId: null }
									: {}),
							});
						})
					)
				),
				loadMemberships: rxMethod<void>(
					pipe(
						switchMap(() =>
							artistNetworkEffect.loadMemberships$().pipe(
								tapResponse({
									next: (memberships) =>
										patchState(store, {
											memberships,
											membershipsLoading: false,
										}),
									error: (error) => {
										console.error(error);
										patchState(store, {
											membershipsLoading: false,
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
							)
						),
						tapResponse({
							next: (artists) =>
								patchState(store, {
									artists: artists.map(toArtistView),
									artistsLoading: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { artistsLoading: false });
							},
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
						map((albums) =>
							albums.map((album) => ({
								...toAlbumView(album),
								artistId: album.artist?.uid ?? '',
							}))
						),
						tapResponse({
							next: (albums) => patchState(store, { albums }),
							error: (error) => console.error(error),
						})
					)
				),
				loadReleases: rxMethod<void>(
					pipe(
						switchMap(() =>
							collectionItemStateService.selectLoadedEntities$()
						),
						tapResponse({
							next: (items) =>
								patchState(store, {
									releases: items.map(toReleaseView),
								}),
							error: (error) => console.error(error),
						})
					)
				),
				setFocus: (nodeId: string) => {
					patchState(store, { query: '' });
					navigate({ focus: nodeId });
				},
				setDepth: (depth: number) =>
					navigate({ depth: toDepth(String(depth)) }),
				select: (nodeId: string | null) =>
					patchState(store, { selectedId: nodeId }),
				setFlag: (flag: NetworkFilterFlag, value: boolean) => {
					patchState(store, { [flag]: value });
					// Keep a `guests` parameter from a link in step with the toggle.
					if (
						flag === 'includeGuests' &&
						route.snapshot.queryParamMap.has('guests')
					) {
						navigate({ guests: value ? 1 : 0 });
					}
				},
				setQuery: (query: string) => patchState(store, { query }),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.followRoute(of(undefined));
			store.loadMemberships(of(undefined));
			store.loadArtists(of(undefined));
			store.loadAlbums(of(undefined));
			store.loadReleases(of(undefined));
		},
	})
);
