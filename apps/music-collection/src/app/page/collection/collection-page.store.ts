import { combineLatest, of, pairwise, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemPlacement,
	CollectionItemStateService,
} from '@music-collection/api';
import {
	MusicCollectionEffect,
	MusicCollectionStanding,
} from '@music-collection/domain/music-collection/core';
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

import { UserSettingsEffect } from '../../data/user-settings';
import {
	ReleaseView,
	decadeDistribution,
	toReleaseView,
	topStyles,
} from '../../shared/music-ui';
import { withCollectionFollowing } from '../collections/collection-following.feature';
import {
	sortCollectionCards,
	toCollectionCard,
} from '../collections/collections.mapper';
import { CollectionCardView } from '../collections/collections.model';

import {
	arrangeShelves,
	chunkGroups,
	collectionStats,
	filterReleases,
	groupReleases,
	packShelf,
	sortReleases,
	splitByPlacement,
} from './collection.mapper';
import {
	COLLECTION_VIEW_DEFAULTS,
	COLLECTION_VIEW_SETTING,
	CollectionViewSettings,
} from './collection-view.setting';
import {
	CollectionGroup,
	CollectionSort,
	CollectionView,
	FormatFilter,
	ReleaseGroup,
	ShelfDrop,
	ShelfUnitView,
} from './collection.model';
import {
	NO_SHELF_LAYOUT,
	SHELF_CUBBY_SIZE,
	SHELF_LAYOUT_SETTING,
	ShelfUnitLayout,
} from './shelf-layout.setting';
import {
	placementInLayout,
	placementsForDrop,
	placementsLeftBehind,
} from './shelf-placement';

/**
 * Cards / rows per render chunk of the grid and list views. The first chunk
 * renders at once, the rest when they approach the viewport (`@defer`).
 */
const RENDER_CHUNK_SIZE = 30;

/** Styles listed in the "Top styles" panel. */
const STYLE_COUNT = 6;

interface CollectionPageState {
	releases: ReleaseView[];
	isLoading: boolean;
	/** The published collections with where this shelf gets the collector. */
	standings: MusicCollectionStanding[];
	standingsLoading: boolean;
	query: string;
	format: FormatFilter;
	sort: CollectionSort;
	group: CollectionGroup;
	view: CollectionView;
	/** The furniture the collector drew in their profile; empty for none. */
	shelfUnits: ShelfUnitLayout[];
	/** The collection items behind `releases`, to write a place back onto. */
	items: CollectionItemEntity[];
	/** A rearrangement is on its way to the server. */
	placing: boolean;
	placeError: string | null;
	/** The copy the placement dialog is open for. */
	placingCopyId: string | null;
}

const initialState: CollectionPageState = {
	releases: [],
	isLoading: true,
	standings: [],
	standingsLoading: true,
	query: '',
	format: 'all',
	shelfUnits: NO_SHELF_LAYOUT.units,
	items: [],
	placing: false,
	placeError: null,
	placingCopyId: null,
	...COLLECTION_VIEW_DEFAULTS,
};

/** Only what the user has actually chosen; the rest stays as it is. */
function chosen(
	settings: CollectionViewSettings
): Partial<CollectionPageState> {
	return Object.fromEntries(
		Object.entries(settings).filter(([, value]) => value !== null)
	);
}

export const CollectionPageStore = signalStore(
	withState(initialState),
	withCollectionFollowing(),
	withComputed((store) => {
		const stats = computed(() => collectionStats(store.releases()));
		const visible = computed(() =>
			sortReleases(
				filterReleases(store.releases(), store.query(), store.format()),
				store.sort()
			)
		);

		const groups = computed(() => groupReleases(visible(), store.group()));

		/*
		 * The collections this shelf is measured against: the collector's
		 * own pick, or — while they have picked none — every published one,
		 * since there is nothing to choose from until they have seen it. An
		 * empty collection — a rule the catalog has nothing for — says
		 * nothing about the shelf, so it stays out; nearly finished ones
		 * come first.
		 */
		const collections = computed<CollectionCardView[]>(() => {
			const followedUids = store.followedUids();
			const followingOnly = !store.followsNothing();

			return sortCollectionCards(
				store.standings().map(toCollectionCard)
			).filter(
				(collection) =>
					collection.total > 0 &&
					(!followingOnly || followedUids.has(collection.uid))
			);
		});

		return {
			stats,
			collections,
			/*
			 * The pick decides which collections are shown, so the section
			 * waits for it as well: better a moment of skeleton than a list
			 * that first shows everything and then takes most of it back.
			 */
			collectionsLoading: computed(
				() => store.standingsLoading() || !store.followingLoaded()
			),
			collectionsSummary: computed(() => ({
				total: collections().length,
				completed: collections().filter(
					(collection) => collection.completed
				).length,
				/** Records the collections ask for that are not on the shelf. */
				missing: collections().reduce(
					(sum, collection) => sum + collection.missing,
					0
				),
				/** Only a complete collection pays, so this is what is held. */
				earnedPoints: collections().reduce(
					(sum, collection) => sum + collection.earnedPoints,
					0
				),
			})),
			decades: computed(() => decadeDistribution(store.releases())),
			styles: computed(() => topStyles(store.releases(), STYLE_COUNT)),
			visible,
			/*
			 * Keyed by view as well: @for only reconciles when the array
			 * changes, so a grid ↔ list switch must yield new groups to
			 * rebuild them with fresh (not yet triggered) deferred chunks.
			 */
			groups: computed(() => {
				const view = store.view();

				return chunkGroups(groups(), RENDER_CHUNK_SIZE).map(
					(group) => ({ ...group, key: `${view}:${group.key}` })
				);
			}),
			/**
			 * The shelf as it stands in the room: compartments packed the way
			 * a collector shelves records — without grouping by format, small
			 * groups sharing a cubby, large ones continuing in the next — and
			 * then filed into the units the collector drew.
			 */
			shelves: computed<ShelfUnitView[]>(() => {
				const units = store.shelfUnits();
				/*
				 * What the collector filed by hand keeps its compartment;
				 * only the rest is packed, so a hand-filed record is never
				 * counted twice — once where it was put, once where the
				 * shelf would have put it.
				 */
				const { placed, loose } = splitByPlacement(visible(), units);
				const compartments: ReleaseGroup[] = packShelf(
					groupReleases(
						loose,
						store.group() === 'none' ? 'format' : store.group()
					),
					SHELF_CUBBY_SIZE
				);

				return arrangeShelves(compartments, units, placed);
			}),
			hasFilter: computed(
				() => store.query().trim() !== '' || store.format() !== 'all'
			),
			/**
			 * The shelf can be rearranged by hand: there is furniture to file
			 * records into, and the shelf shows the whole collection. Under a
			 * filter it shows a part of it, and a compartment arranged out of
			 * a part would renumber records that are not even on the page.
			 */
			placeable: computed(
				() =>
					store.shelfUnits().length > 0 &&
					store.query().trim() === '' &&
					store.format() === 'all'
			),
			/**
			 * A single copy can be filed by hand wherever it is found —
			 * unlike dragging the shelf around, which arranges a whole
			 * compartment and therefore needs the whole collection on the
			 * page. It only asks for furniture to file it into.
			 */
			canPlaceCopies: computed(() => store.shelfUnits().length > 0),
			/** The copy the placement dialog is open for. */
			placingCopy: computed(
				() =>
					store
						.releases()
						.find(
							(release) => release.id === store.placingCopyId()
						) ?? null
			),
			/**
			 * Where the collector's other copies stand, so the picker can
			 * say how full a compartment is — the copy being filed left out,
			 * as it is about to leave the one it stands in.
			 */
			filedElsewhere: computed<CollectionItemPlacement[]>(() =>
				store
					.releases()
					.filter(
						(release) =>
							release.id !== store.placingCopyId() &&
							release.placement
					)
					.map(
						(release) =>
							release.placement as CollectionItemPlacement
					)
			),
		};
	}),
	withMethods(
		(
			store,
			collectionItemStateService = inject(CollectionItemStateService),
			musicCollectionEffect = inject(MusicCollectionEffect),
			settingsEffect = inject(UserSettingsEffect)
		) => {
			const savePreferences = () => {
				settingsEffect
					.save(COLLECTION_VIEW_SETTING, {
						sort: store.sort(),
						group: store.group(),
						view: store.view(),
					})
					.catch((error) => {
						console.error('Collection view not saved', error);
					});
			};

			return {
				load: rxMethod<void>(
					pipe(
						tap(() => patchState(store, { isLoading: true })),
						switchMap(() =>
							collectionItemStateService.selectLoadedEntities$()
						),
						tapResponse({
							next: (entities: CollectionItemEntity[]) =>
								patchState(store, {
									items: entities,
									releases: entities.map(toReleaseView),
									isLoading: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { isLoading: false });
							},
						})
					)
				),
				loadCollections: rxMethod<void>(
					pipe(
						tap(() =>
							patchState(store, { standingsLoading: true })
						),
						switchMap(() => musicCollectionEffect.listStandings$()),
						tapResponse({
							next: (standings: MusicCollectionStanding[]) =>
								patchState(store, {
									standings,
									standingsLoading: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { standingsLoading: false });
							},
						})
					)
				),
				/**
				 * Follows a rearrangement, so a failed one can be said out
				 * loud. The picker closes once the place is saved, and stays
				 * open with the error when it is not.
				 */
				watchPlacing: rxMethod<void>(
					pipe(
						switchMap(() =>
							combineLatest([
								collectionItemStateService.selectPlacing$(),
								collectionItemStateService.selectError$(),
							])
						),
						pairwise(),
						tap(([[wasPlacing], [placing, error]]) => {
							patchState(store, { placing });
							if (wasPlacing && !placing) {
								patchState(store, {
									placeError: error,
									placingCopyId: error
										? store.placingCopyId()
										: null,
								});
							}
						})
					)
				),
				/**
				 * Files the dropped record where it was let go. Every record
				 * the target compartment shows gets a place, not only the
				 * dropped one: the collector arranged what they see, and a
				 * place given to one record alone would leave the shelf free
				 * to reshuffle its neighbours around it.
				 *
				 * The compartment the record came out of is arranged as well,
				 * so the space it leaves behind stays free for whatever the
				 * collector meant to stand there. A record is usually pulled
				 * out to make room, not to have the shelf close the gap
				 * behind it.
				 */
				fileRecord(drop: ShelfDrop): void {
					const cells = store
						.shelves()
						.flatMap((shelf) => shelf.compartments);
					const cell = cells.find(
						(compartment) =>
							compartment.spot?.unitId === drop.unitId &&
							compartment.spot.row === drop.row &&
							compartment.spot.column === drop.column
					);
					const from = cells.find(
						(compartment) =>
							compartment.spot &&
							compartment !== cell &&
							compartment.items.some(
								(release) => release.id === drop.releaseId
							)
					);
					const moved = store
						.releases()
						.find((release) => release.id === drop.releaseId);

					if (
						!cell ||
						!moved ||
						!store.placeable() ||
						store.placing()
					) {
						return;
					}

					const byId = new Map(
						store.items().map((item) => [item.uid, item])
					);
					const placements = [
						...(from?.spot
							? placementsLeftBehind(from.items, moved, from.spot)
							: []),
						...placementsForDrop(
							cell.items,
							moved,
							{
								unitId: drop.unitId,
								row: drop.row,
								column: drop.column,
							},
							drop.index
						),
					]
						.map(({ releaseId, placement }) => ({
							collectionItem: byId.get(releaseId),
							placement,
						}))
						.filter(
							(
								move
							): move is {
								collectionItem: CollectionItemEntity;
								placement: CollectionItemPlacement;
							} => !!move.collectionItem
						);

					patchState(store, { placeError: null });
					collectionItemStateService.dispatchPlaceEntitiesAction(
						placements
					);
				},
				/** Opens the picker on one copy, wherever it is shown. */
				openPlacement(copyId: string): void {
					patchState(store, {
						placingCopyId: copyId,
						placeError: null,
					});
				},
				closePlacement(): void {
					patchState(store, { placingCopyId: null });
				},
				/**
				 * Files the copy the picker is open for, or takes its place
				 * back with `null`. Only that one copy moves: the rest of the
				 * compartment keeps what it has.
				 */
				placeCopy(placement: CollectionItemPlacement | null): void {
					const item = store
						.items()
						.find((owned) => owned.uid === store.placingCopyId());

					if (!item || !store.canPlaceCopies() || store.placing()) {
						return;
					}

					patchState(store, { placeError: null });
					collectionItemStateService.dispatchPlaceEntityAction(
						item,
						placement &&
							placementInLayout(placement, store.shelfUnits())
					);
				},
				/** The furniture kept for the user, and any later change. */
				loadShelfLayout: rxMethod<void>(
					pipe(
						switchMap(() =>
							settingsEffect.value$(SHELF_LAYOUT_SETTING)
						),
						tap(({ units }) =>
							patchState(store, { shelfUnits: units })
						)
					)
				),
				/** The layout kept for the user, and any later change to it. */
				loadPreferences: rxMethod<void>(
					pipe(
						switchMap(() =>
							settingsEffect.value$(COLLECTION_VIEW_SETTING)
						),
						tap((settings) => patchState(store, chosen(settings)))
					)
				),
				setQuery: (query: string) => patchState(store, { query }),
				setFormat: (format: FormatFilter) =>
					patchState(store, { format }),
				setSort: (sort: CollectionSort) => {
					patchState(store, { sort });
					savePreferences();
				},
				setGroup: (group: CollectionGroup) => {
					patchState(store, { group });
					savePreferences();
				},
				setView: (view: CollectionView) => {
					patchState(store, { view });
					savePreferences();
				},
				clearFilters: () =>
					patchState(store, { query: '', format: 'all' }),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadPreferences(of(undefined));
			store.loadShelfLayout(of(undefined));
			store.load(of(undefined));
			store.watchPlacing(of(undefined));
			store.loadCollections(of(undefined));
			store.loadFollowing(of(undefined));
		},
	})
);
