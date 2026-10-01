import { combineLatest, of, pairwise, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemPlacement,
	CollectionItemStateService,
} from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
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

import { CollectorProfileEffect } from '../../data/collector-profile';
import { UserSettingsEffect } from '../../data/user-settings';
import { withCopyDisposal } from '../../shared/copy-disposal/copy-disposal.feature';
import {
	DisposalDraft,
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
	shelfMatches,
	shelfPlaceLabel,
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
	ShelfMatchListing,
	ShelfMatchView,
	ShelfUnitView,
} from './collection.model';
import {
	NO_SHELF_LAYOUT,
	SHELF_LAYOUT_SETTING,
	ShelfUnitLayout,
} from './shelf-layout.setting';
import {
	maxPositionIn,
	placementInLayout,
	placementsForDrop,
	placementsLeftBehind,
	placementsToFreeze,
	placementsToRelease,
} from './shelf-placement';

/**
 * Cards / rows per render chunk of the grid and list views. The first chunk
 * renders at once, the rest when they approach the viewport (`@defer`).
 */
const RENDER_CHUNK_SIZE = 30;

/** Styles listed in the "Top styles" panel. */
const STYLE_COUNT = 6;

/**
 * How many of the found records are listed by name above the shelf. A single
 * letter typed into the search box finds hundreds, and a list of hundreds is
 * no help in finding one — the shelf itself shows the rest, lit up.
 */
const MATCH_LIST_LIMIT = 8;

interface CollectionPageState {
	releases: ReleaseView[];
	isLoading: boolean;
	/** A guest has no collection to show; they are asked to sign in. */
	isAuthenticated: boolean;
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
	/** The found record the shelf is pointed at, where one was picked. */
	pickedMatchId: string | null;
}

const initialState: CollectionPageState = {
	releases: [],
	isLoading: true,
	isAuthenticated: false,
	standings: [],
	standingsLoading: true,
	query: '',
	format: 'all',
	shelfUnits: NO_SHELF_LAYOUT.units,
	items: [],
	placing: false,
	placeError: null,
	placingCopyId: null,
	pickedMatchId: null,
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
	withCopyDisposal(),
	withComputed((store, text = inject(TextService)) => {
		const stats = computed(() => collectionStats(store.releases()));
		const visible = computed(() =>
			sortReleases(
				filterReleases(store.releases(), store.query(), store.format()),
				store.sort()
			)
		);

		/**
		 * What the shelf is built out of: the whole collection, the format
		 * chips aside. The search deliberately takes nothing off it — a shelf
		 * repacked out of the three records a query found would stand them
		 * somewhere they do not stand in the room, and where a record stands
		 * is the one thing this view is for. The search points at them
		 * instead, which is what `matches` is.
		 */
		const onShelf = computed(() =>
			sortReleases(
				filterReleases(store.releases(), '', store.format()),
				store.sort()
			)
		);

		/** The dictionary the group headings are written from. */
		const words = computed(() => ({
			t: text.translator(),
			catalog: text.catalog(),
		}));

		const groups = computed(() =>
			groupReleases(visible(), store.group(), words())
		);

		/**
		 * The shelf as it stands in the room: compartments packed the way a
		 * collector shelves records — without grouping by format, small
		 * groups sharing a cubby, large ones continuing in the next — and
		 * then filed into the units the collector drew.
		 *
		 * A local, because what is asked of the arrangement is asked twice:
		 * once to draw it, and once to tell whether it keeps itself.
		 */
		const shelves = computed<ShelfUnitView[]>(() => {
			const units = store.shelfUnits();
			/*
			 * What the collector filed by hand keeps its compartment; only
			 * the rest is packed, so a hand-filed record is never counted
			 * twice — once where it was put, once where the shelf would
			 * have put it.
			 */
			const { placed, loose } = splitByPlacement(onShelf(), units);
			const shelved: ReleaseGroup[] = groupReleases(
				loose,
				store.group() === 'none' ? 'format' : store.group(),
				words()
			);

			return arrangeShelves(shelved, units, placed);
		});

		/**
		 * The records the search found, and where each one stands — read off
		 * the shelf as it is drawn, so what comes back is directions to the
		 * furniture rather than a filtered collection.
		 */
		const matches = computed<ShelfMatchView[]>(() =>
			shelfMatches(shelves(), store.query())
		);

		/**
		 * The one the shelf is turned to: what the collector picked out of
		 * the list, or — until they pick one, and the moment their pick stops
		 * matching — the first record found.
		 */
		const focusedMatch = computed<ShelfMatchView | null>(
			() =>
				matches().find((match) => match.id === store.pickedMatchId()) ??
				matches()[0] ??
				null
		);

		/** The records standing in a drawn compartment, overflow aside. */
		const standing = computed(() =>
			shelves()
				.flatMap((shelf) => shelf.compartments)
				.filter((compartment) => !!compartment.spot)
				.flatMap((compartment) => compartment.items)
		);

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
			matches,
			focusedMatch,
			/**
			 * The found records named above the shelf, each with the way to
			 * it written out; the ones past the limit are only lit up.
			 */
			listedMatches: computed<ShelfMatchListing[]>(() =>
				matches()
					.slice(0, MATCH_LIST_LIMIT)
					.map((match) => ({
						...match,
						where: shelfPlaceLabel(match, words()),
					}))
			),
			/** How many found records the list above the shelf leaves out. */
			moreMatches: computed(() =>
				Math.max(0, matches().length - MATCH_LIST_LIMIT)
			),
			/** The copies the shelf lights up, for the spines to read. */
			matchIds: computed(
				() => new Set(matches().map((match) => match.id))
			),
			/**
			 * What is actually on the page. The shelf keeps the search out of
			 * it, so "nothing to show" there means an empty collection rather
			 * than a query nothing answers.
			 */
			shown: computed(() =>
				store.view() === 'shelf' ? onShelf() : visible()
			),
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
			shelves,

			/**
			 * Less than the whole collection is on the page. On the shelf a
			 * query takes nothing off it, so there only the format chips can.
			 */
			narrowed: computed(() =>
				store.view() === 'shelf'
					? store.format() !== 'all'
					: store.query().trim() !== '' || store.format() !== 'all'
			),
			/**
			 * The shelf can be rearranged by hand: there is furniture to file
			 * records into, and the shelf shows the whole collection. Under a
			 * format chip it shows a part of it, and a compartment arranged
			 * out of a part would renumber records that are not even on the
			 * page. A search is not such a filter — it lights the shelf up
			 * rather than cutting it down — so it leaves the dragging alone.
			 */
			placeable: computed(
				() => store.shelfUnits().length > 0 && store.format() === 'all'
			),
			/**
			 * A single copy can be filed by hand wherever it is found —
			 * unlike dragging the shelf around, which arranges a whole
			 * compartment and therefore needs the whole collection on the
			 * page. It asks for furniture to file it into, and for the same
			 * right as letting a copy go: filing one is a write on it.
			 */
			canPlaceCopies: computed(
				() => store.canManageCopies() && store.shelfUnits().length > 0
			),
			/**
			 * Whether the shelf keeps itself: every record on it holds a
			 * place of its own, so nothing the collection does — a record
			 * bought, a record sold, a different sort — moves any of them.
			 *
			 * Read off the records rather than kept as a flag, because that
			 * is what it actually is: the moment one record is handed back
			 * to the shelf, the shelf is packing again.
			 */
			shelfIsKept: computed(
				() =>
					// What overflowed is left out: no compartment is drawn
					// for it, so there is no place it could be given, and a
					// shelf would never count as kept while one record of
					// it did not fit.
					standing().length > 0 &&
					standing().every((release) => !!release.placement)
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
			settingsEffect = inject(UserSettingsEffect),
			authentication = inject(AuthenticationStateService)
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
				/**
				 * Who the shelf belongs to. `authenticatedGuard` keeps a guest
				 * off this route, so this is what is left for the case it is
				 * ever reached without a session: the page says so instead of
				 * blaming the filters for the empty shelf.
				 */
				watchSession: rxMethod<void>(
					pipe(
						switchMap(() =>
							authentication.selectIsAuthenticated$()
						),
						tap((isAuthenticated) =>
							patchState(store, { isAuthenticated })
						)
					)
				),
				login(): void {
					authentication.dispatchLogin();
				},
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
					/* How far along a compartment goes is its own unit's. */
					const capOf = (unitId: string): number => {
						const unit = store
							.shelfUnits()
							.find((drawn) => drawn.id === unitId);

						return unit ? maxPositionIn(unit) : 1;
					};
					const placements = [
						...(from?.spot
							? placementsLeftBehind(
									from.items,
									moved,
									from.spot,
									capOf(from.spot.unitId)
								)
							: []),
						...placementsForDrop(
							cell.items,
							moved,
							{
								unitId: drop.unitId,
								row: drop.row,
								column: drop.column,
							},
							drop.index,
							capOf(drop.unitId)
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
				/**
				 * Keeps the shelf as it stands: every record on it is given
				 * the place it is drawn in, so nothing moves it again.
				 *
				 * Until this is done the shelf packs itself on every draw,
				 * and a record bought, sold or renamed shifts everything
				 * after it — the thing that makes a shelf you have learnt by
				 * sight unreadable. It writes what the collector is looking
				 * at, which is why it asks for the same unfiltered shelf
				 * that dragging does: an arrangement of a filtered part
				 * would hand out places behind the records left off the page.
				 */
				keepShelf(): void {
					if (!store.placeable() || store.placing()) {
						return;
					}

					const byId = new Map(
						store.items().map((item) => [item.uid, item])
					);
					const placements = placementsToFreeze(store.shelves())
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

					if (!placements.length) {
						return;
					}

					patchState(store, { placeError: null });
					collectionItemStateService.dispatchPlaceEntitiesAction(
						placements
					);
				},
				/**
				 * Hands the shelf back: every place is dropped, and the
				 * packing takes over again. The way out for a collector who
				 * would rather have the shelf keep itself in order than keep
				 * it in order themselves.
				 */
				releaseShelf(): void {
					if (!store.placeable() || store.placing()) {
						return;
					}

					const byId = new Map(
						store.items().map((item) => [item.uid, item])
					);
					const placements = placementsToRelease(store.releases())
						.map(({ releaseId }) => ({
							collectionItem: byId.get(releaseId),
							placement: null,
						}))
						.filter(
							(
								move
							): move is {
								collectionItem: CollectionItemEntity;
								placement: null;
							} => !!move.collectionItem
						);

					if (!placements.length) {
						return;
					}

					patchState(store, { placeError: null });
					collectionItemStateService.dispatchPlaceEntitiesAction(
						placements
					);
				},
				/**
				 * Marks the copy the dialog is open for sold, traded… so that
				 * a record can be let go of from the shelf it stands on,
				 * rather than only from the album page behind it.
				 */
				removeCopy(draft: DisposalDraft): void {
					const item = store
						.items()
						.find((owned) => owned.uid === store.removingCopyId());

					if (item && store.canManageCopies()) {
						store.disposeCopy(item, draft);
					}
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
				/**
				 * Points the shelf at one of the records the search found.
				 * Forgotten as soon as that record stops being found, so a
				 * query typed further on never leaves the shelf turned to a
				 * record nobody is looking for any more.
				 */
				pickMatch: (pickedMatchId: string) =>
					patchState(store, { pickedMatchId }),
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
					patchState(store, {
						query: '',
						format: 'all',
						pickedMatchId: null,
					}),
			};
		}
	),
	withHooks({
		onInit(store) {
			// The collector's public page, if they have one, is put together
			// from this very shelf — so following it starts where the shelf is
			// opened, and goes on wherever a record is filed from later.
			inject(CollectorProfileEffect).watch();
			store.watchSession(of(undefined));
			store.watchCopyPermission(of(undefined));
			store.loadPreferences(of(undefined));
			store.loadShelfLayout(of(undefined));
			store.load(of(undefined));
			store.watchPlacing(of(undefined));
			store.watchDisposing(of(undefined));
			store.loadCollections(of(undefined));
			store.loadFollowing(of(undefined));
		},
	})
);
