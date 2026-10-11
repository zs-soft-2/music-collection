import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { TextService } from '@music-collection/core/i18n';
import { AuthenticationStateService } from '@music-collection/api';
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

import {
	CollectorCardDocument,
	CollectorProfileEffect,
} from '../../data/collector-profile';
import { Crumb, pageTrail } from '../../shared/page-breadcrumb';
import { collectionOriginParams } from '../../shared/page-origin';
import { crowdBySlug, toWallEntries } from '../collectors/collectors.mapper';
import { CollectionCrowd, WallEntry } from '../collectors/collectors.model';

import { withCollectionFollowing } from './collection-following.feature';
import {
	sortCollectionAlbums,
	toCollectionDecades,
	toCollectionDetail,
	toCollectionRule,
	toNextAlbums,
} from './collections.mapper';
import {
	AlbumFilter,
	AlbumSort,
	COLLECTION_HUNT_COUNT,
	CollectionDetailView,
} from './collections.model';

/** How many words of the rule the header carries before the panel. */
const HERO_CHIPS = 3;

function emptyCrowd(): CollectionCrowd {
	return { finishers: [], finisherCount: 0, hunters: [], hunterCount: 0 };
}

interface CollectionDetailPageState {
	collection: CollectionDetailView | null;
	/**
	 * The standing the view was built from. Kept because the hunt list is
	 * ranked from it: what to buy next is the engine's answer, and the
	 * engine reads standings rather than views.
	 */
	standing: MusicCollectionStanding | null;
	isLoading: boolean;
	/** The slug names no published collection. */
	notFound: boolean;
	filter: AlbumFilter;
	sort: AlbumSort;
	/** The collectors who share a page: who is on this collection. */
	wall: WallEntry[];
	/** Signed in, as opposed to reading the collection as a guest. */
	authenticated: boolean;
}

const initialState: CollectionDetailPageState = {
	collection: null,
	standing: null,
	isLoading: true,
	notFound: false,
	filter: 'all',
	sort: 'year',
	wall: [],
	authenticated: false,
};

export const CollectionDetailPageStore = signalStore(
	withState(initialState),
	withCollectionFollowing(),
	withComputed((store, text = inject(TextService)) => ({
		/**
		 * Whether there is a collector behind this reader. A guest has no
		 * shelf to measure — `0 / 20 · 0%` over an empty ring reads as a
		 * collection nobody got anywhere with rather than as nobody being
		 * signed in — and nothing to take the collection on with either.
		 */
		isSignedIn: computed(() => store.authenticated()),
		/**
		 * Whether this collection is one the collector is after.
		 *
		 * `isFollowed`, not `followed`: the following feature already carries
		 * a `followed` of its own — the uids — and a signal store refuses to
		 * let a member be overridden. Named the same, this computed would
		 * simply not be created, and the page would read the uid list as a
		 * truthy value: the button would say "Following" about every
		 * collection, followed or not.
		 */
		isFollowed: computed(() => {
			const uid = store.collection()?.uid;

			return !!uid && store.followedUids().has(uid);
		}),
		/** Whether others are told they are after it; see `isFollowed`. */
		isShown: computed(() => {
			const uid = store.collection()?.uid;

			return !!uid && store.shownUids().has(uid);
		}),
		/** Collections › this collection. */
		/** Home › the collections › this one. */
		trail: computed<Crumb[]>(() => {
			const name = store.collection()?.name;

			return pageTrail(text.translator(), [
				{
					label: text.translator()('nav.collections'),
					link: '/collections',
				},
				name ? { label: name } : null,
			]);
		}),
		/**
		 * Carried on to every album opened from here, so its own trail leads
		 * back to this collection rather than to the shelf.
		 */
		albumOrigin: computed(() =>
			collectionOriginParams(store.collection()?.slug ?? null)
		),
		albums: computed(() => {
			const albums = store.collection()?.albums ?? [];
			const filter = store.filter();
			const shown =
				filter === 'all'
					? albums
					: albums.filter(
							(album) => album.owned === (filter === 'owned')
						);

			return sortCollectionAlbums(shown, store.sort());
		}),
		/** What the rule asks for, line by line. */
		rule: computed(() =>
			toCollectionRule(
				store.standing()?.collection.criteria,
				store.collection()?.albums ?? []
			)
		),
		/**
		 * The rule in a few words, for the header: the first thing each
		 * line of it names. The panel below says all of it.
		 */
		chips: computed(() =>
			toCollectionRule(
				store.standing()?.collection.criteria,
				store.collection()?.albums ?? []
			)
				.filter((row) => !row.excluded)
				.map((row) => row.values[0])
				.slice(0, HERO_CHIPS)
		),
		/** The collection across the decades, and the gap in it. */
		decades: computed(() =>
			toCollectionDecades(store.collection()?.albums ?? [])
		),
		/** Who finished this one, and who says they are after it. */
		crowd: computed<CollectionCrowd>(() => {
			const slug = store.collection()?.slug;

			return (
				(slug ? crowdBySlug(store.wall()).get(slug) : null) ??
				emptyCrowd()
			);
		}),
	})),
	withComputed((store, effect = inject(MusicCollectionEffect)) => ({
		/**
		 * Which records to buy next, out of this one collection.
		 *
		 * Only where there is a shelf to continue and a gap to close: a
		 * collector who owns none of it is not helped by being told that
		 * every record of it is missing, and one who owns all of it has
		 * nothing left to hunt.
		 */
		nextAlbums: computed(() => {
			const standing = store.standing();
			const collection = store.collection();

			if (!standing || !collection?.owned || !collection.missing) {
				return [];
			}

			return toNextAlbums(
				effect.suggestNextAlbums([standing]),
				[collection],
				COLLECTION_HUNT_COUNT
			);
		}),
	})),
	withMethods(
		(
			store,
			effect = inject(MusicCollectionEffect),
			profiles = inject(CollectorProfileEffect),
			authentication = inject(AuthenticationStateService)
		) => ({
			/** Google sign-in, the same the top bar offers. */
			signIn: () => authentication.dispatchLogin(),
			/** Follows sign-in and sign-out while the page is open. */
			loadAuthentication: rxMethod<void>(
				pipe(
					switchMap(() => authentication.selectIsAuthenticated$()),
					tapResponse({
						next: (authenticated: boolean) =>
							patchState(store, { authenticated }),
						error: (error: unknown) => console.error(error),
					})
				)
			),
			/**
			 * The collectors who share a page, for the faces on this collection.
			 * The same directory the wall itself reads, and it is read here so
			 * that a collection answers "who else" where it is being looked at.
			 */
			loadWall: rxMethod<void>(
				pipe(
					switchMap(() => profiles.cards$()),
					tapResponse({
						next: (cards: CollectorCardDocument[]) =>
							patchState(store, { wall: toWallEntries(cards) }),
						error: (error) =>
							console.error('Collector wall not read', error),
					})
				)
			),
			load: rxMethod<string>(
				pipe(
					tap(() =>
						patchState(store, { isLoading: true, notFound: false })
					),
					switchMap((slug) => effect.loadStanding$(slug)),
					tapResponse({
						next: (standing: MusicCollectionStanding | null) =>
							patchState(store, {
								collection: standing
									? toCollectionDetail(standing)
									: null,
								standing,
								notFound: !standing,
								isLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { isLoading: false });
						},
					})
				)
			),
			setFilter: (filter: AlbumFilter) => patchState(store, { filter }),
			setSort: (sort: AlbumSort) => patchState(store, { sort }),
			/** Follows or drops the collection on show. */
			/** Shows this collection on the collector's public page, or hides it. */
			toggleShownCollection: (): void => {
				const uid = store.collection()?.uid;

				if (uid) {
					store.toggleShown(uid);
				}
			},
			toggleFollowed: (): void => {
				const uid = store.collection()?.uid;

				if (uid) {
					store.toggleFollow(uid);
				}
			},
		})
	),
	withHooks({
		onInit(store) {
			store.loadFollowing(of(undefined));
			store.loadWall(of(undefined));
			store.loadAuthentication(of(undefined));
		},
	})
);
