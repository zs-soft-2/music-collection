import { Observable, combineLatest, filter, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	CollectionItemStateService,
	EntityCounts,
	EntityQuantityStateService,
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

import { ArtistLineupEffect } from '../../../data/artist-lineup';
import { TrackStats, TrackStatsEffect } from '../../../data/track-stats';
import {
	ReleaseView,
	toReleaseView,
	topStyles,
} from '../../../shared/music-ui';
import { ADMIN_NAV, AdminNavItem } from '../admin-nav';
import {
	albumTypeDistribution,
	catalogCompleteness,
	collectionGrowth,
	trackCompleteness,
} from './admin-dashboard.mapper';

interface AdminDashboardState {
	counts: EntityCounts;
	loading: boolean;
	albums: AlbumEntity[];
	artists: ArtistEntity[];
	releases: ReleaseView[];
	/**
	 * Null until the track data arrives, or when it cannot be read. The
	 * completeness panel does not wait for it: the track rows join the
	 * albums and artists once the tracks are there.
	 */
	trackStats: TrackStats | null;
	/**
	 * Uids of the bands with a line-up, null until the memberships arrive or
	 * when they cannot be read. The line-up row waits for it the same way.
	 */
	artistUidsWithLineup: ReadonlySet<string> | null;
	albumsLoading: boolean;
	artistsLoading: boolean;
	releasesLoading: boolean;
}

export interface AdminDashboardTile extends AdminNavItem {
	count: number | null;
}

const initialState: AdminDashboardState = {
	counts: {},
	loading: true,
	albums: [],
	artists: [],
	releases: [],
	trackStats: null,
	artistUidsWithLineup: null,
	albumsLoading: true,
	artistsLoading: true,
	releasesLoading: true,
};

const COUNTED_ITEMS = ADMIN_NAV.flatMap((group) => group.items).filter(
	(item) => !!item.countType
);

/** Stílusok száma a katalógus-összetétel diagramján. */
const STYLE_COUNT = 8;

/**
 * Egy entitás-típus listáját egyszer tölti be: az NgRx store-ból olvas, és
 * elindítja a listázást, ha a store még üres.
 */
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
 * A vezérlőpult állapota: élő entitás-számok az admin menü szerint, valamint
 * a katalógus adatminősége, összetétele és a gyűjtemény gyarapodása.
 */
export const AdminDashboardStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		tiles: computed<AdminDashboardTile[]>(() =>
			COUNTED_ITEMS.map((item) => ({
				...item,
				count: store.counts()[item.countType ?? ''] ?? null,
			}))
		),
		quickActions: computed(() =>
			ADMIN_NAV.flatMap((group) => group.items).filter(
				(item) => !!item.createLabel
			)
		),
		catalogLoading: computed(
			() => store.albumsLoading() || store.artistsLoading()
		),
		completeness: computed(() => {
			const trackStats = store.trackStats();

			return [
				...catalogCompleteness(
					store.albums(),
					store.artists(),
					trackStats?.albumUids ?? null,
					store.artistUidsWithLineup()
				),
				...(trackStats ? [trackCompleteness(trackStats)] : []),
			];
		}),
		growth: computed(() => collectionGrowth(store.releases())),
		albumTypes: computed(() => albumTypeDistribution(store.albums())),
		styles: computed(() =>
			topStyles(
				store.albums().map((album) => ({ styles: album.styles ?? [] })),
				STYLE_COUNT
			)
		),
	})),
	withMethods(
		(
			store,
			quantityState = inject(EntityQuantityStateService),
			albumState = inject(AlbumStateService),
			artistState = inject(ArtistStateService),
			collectionItemState = inject(CollectionItemStateService),
			trackStatsEffect = inject(TrackStatsEffect),
			artistLineupEffect = inject(ArtistLineupEffect)
		) => ({
			load: rxMethod<void>(
				pipe(
					tap(() =>
						quantityState.dispatchCountEntitiesAction(
							COUNTED_ITEMS.map((item) => item.countType ?? '')
						)
					),
					switchMap(() =>
						combineLatest([
							quantityState.selectEntityCounts$(),
							quantityState.selectEntityCountsLoading$(),
						])
					),
					tapResponse({
						next: ([counts, loading]) =>
							patchState(store, { counts, loading }),
						error: () => patchState(store, { loading: false }),
					})
				)
			),
			loadAlbums: rxMethod<void>(
				pipe(
					switchMap(() =>
						entities$(
							() => albumState.selectEntities$(),
							() => albumState.dispatchListEntitiesAction()
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
							() => artistState.selectEntities$(),
							() => artistState.dispatchListEntitiesAction()
						)
					),
					tapResponse({
						next: (artists) =>
							patchState(store, {
								artists,
								artistsLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { artistsLoading: false });
						},
					})
				)
			),
			loadTrackStats: rxMethod<void>(
				pipe(
					switchMap(() => trackStatsEffect.load$()),
					tapResponse({
						next: (trackStats) => patchState(store, { trackStats }),
						error: (error) => console.error(error),
					})
				)
			),
			loadLineups: rxMethod<void>(
				pipe(
					switchMap(() =>
						artistLineupEffect.loadArtistUidsWithLineup$()
					),
					tapResponse({
						next: (artistUidsWithLineup) =>
							patchState(store, { artistUidsWithLineup }),
						error: (error) => console.error(error),
					})
				)
			),
			loadReleases: rxMethod<void>(
				pipe(
					switchMap(() =>
						collectionItemState.selectLoadedEntities$()
					),
					tapResponse({
						next: (items) =>
							patchState(store, {
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
	withHooks({
		onInit(store) {
			store.load();
			store.loadAlbums();
			store.loadArtists();
			store.loadTrackStats();
			store.loadLineups();
			store.loadReleases();
		},
	})
);
