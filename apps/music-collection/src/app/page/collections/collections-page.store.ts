import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
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

import { withCollectionFollowing } from './collection-following.feature';
import {
	sortCollectionCards,
	toCollectionCard,
	toNextAlbums,
} from './collections.mapper';
import {
	CollectionCardListView,
	CollectionCardView,
	CollectionsTab,
	NextAlbumView,
} from './collections.model';

interface CollectionsPageState {
	collections: CollectionCardView[];
	/** The records worth buying next, the best buy first. */
	nextAlbums: NextAlbumView[];
	isLoading: boolean;
	tab: CollectionsTab;
	/** Free text over the name and the description. */
	query: string;
}

const initialState: CollectionsPageState = {
	collections: [],
	nextAlbums: [],
	isLoading: true,
	tab: 'following',
	query: '',
};

function matches(collection: CollectionCardView, query: string): boolean {
	return (
		collection.name.toLowerCase().includes(query) ||
		(collection.description ?? '').toLowerCase().includes(query)
	);
}

export const CollectionsPageStore = signalStore(
	withState(initialState),
	withCollectionFollowing(),
	withComputed((store) => ({
		completedCount: computed(
			() =>
				store.collections().filter((collection) => collection.completed)
					.length
		),
		/** Albums the collections ask for that are not on the shelf yet. */
		missingCount: computed(() =>
			store
				.collections()
				.reduce((sum, collection) => sum + collection.missing, 0)
		),
		/** Only complete collections pay, so this is what is actually held. */
		earnedPoints: computed(() =>
			store
				.collections()
				.reduce((sum, collection) => sum + collection.earnedPoints, 0)
		),
		/** Followed collections that are still published. */
		followingCount: computed(() => {
			const followedUids = store.followedUids();

			return store
				.collections()
				.filter((collection) => followedUids.has(collection.uid))
				.length;
		}),
		/**
		 * The cards on show: the pick on the Following tab, everything on the
		 * other, narrowed by the search either way. A collector who has picked
		 * nothing is shown the whole list rather than an empty page — there is
		 * nothing to choose from until they have seen it.
		 */
		visible: computed<CollectionCardListView[]>(() => {
			const followedUids = store.followedUids();
			const followingOnly =
				store.tab() === 'following' && !store.followsNothing();
			const query = store.query().trim().toLowerCase();

			return store
				.collections()
				.filter(
					(collection) =>
						(!followingOnly || followedUids.has(collection.uid)) &&
						(!query || matches(collection, query))
				)
				.map((collection) => ({
					...collection,
					followed: followedUids.has(collection.uid),
				}));
		}),
		/** Empty where there is no shelf to continue, or no gap left in one. */
		showsHunt: computed(() => store.nextAlbums().length > 0),
		/** The Following tab is standing in for a pick nobody has made. */
		showsEverything: computed(
			() => store.tab() === 'following' && store.followsNothing()
		),
	})),
	withMethods((store, effect = inject(MusicCollectionEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.listStandings$()),
				tapResponse({
					next: (standings: MusicCollectionStanding[]) => {
						const collections = sortCollectionCards(
							standings.map(toCollectionCard)
						);
						/*
						 * The hunt is about a shelf. With nothing on it — a
						 * guest, or a collector who has not filed a record yet
						 * — there is nothing to continue, and the records are
						 * not ranked at all: a guest is not made to pay, even
						 * in a pass over memory, for advice given to nobody.
						 */
						const hasShelf = collections.some(
							(collection) => collection.owned > 0
						);

						patchState(store, {
							collections,
							/*
							 * Over every published collection, not only the
							 * ones followed: the pick is a view, and a
							 * collection nobody starred still pays when it is
							 * finished — the same reason the header counts
							 * them all.
							 */
							nextAlbums: hasShelf
								? toNextAlbums(
										effect.suggestNextAlbums(standings),
										collections
									)
								: [],
							isLoading: false,
						});
					},
					error: (error) => {
						console.error(error);
						patchState(store, { isLoading: false });
					},
				})
			)
		),
		setTab: (tab: CollectionsTab) => patchState(store, { tab }),
		setQuery: (query: string) => patchState(store, { query }),
	})),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadFollowing(of(undefined));
		},
	})
);
