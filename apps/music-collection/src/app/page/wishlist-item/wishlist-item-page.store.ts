import { map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReleaseEntity, WishlistItemEntity } from '@music-collection/api';
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

import { Crumb } from '../../shared/page-breadcrumb';
import {
	PressingRow,
	newestPressingFirst,
	toPressingRow,
} from '../../shared/entity-view';
import { WishlistDetailsEffect } from '../../data/wishlist-details';

interface WishlistItemPageState {
	itemId: string;
	item: WishlistItemEntity | null;
	pressings: ReleaseEntity[];
	loading: boolean;
}

const initialState: WishlistItemPageState = {
	itemId: '',
	item: null,
	pressings: [],
	loading: true,
};

/**
 * The wish page: a record someone is after — which album, in what shape, and
 * which pressings of it the catalog knows, so a wish can be read next to
 * what would answer it.
 */
export const WishlistItemPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const album = computed(() => store.item()?.albumReference ?? null);
		const artist = computed(() => store.item()?.artistReference ?? null);

		return {
			album,
			artist,
			coverUrl: computed(() => album()?.coverImage?.filePath ?? null),
			/** The formats the collector would take it in. */
			medias: computed(() => store.item()?.medias ?? []),
			collector: computed(() => {
				const user = store.item()?.userReference;

				return user?.displayName || null;
			}),
			/** Still wanted, or already struck off the list. */
			isActive: computed(() => store.item()?.isActive ?? false),
			pressingRows: computed<PressingRow[]>(() =>
				newestPressingFirst(store.pressings().map(toPressingRow))
			),
			notFound: computed(() => !store.loading() && !store.item()),
			trail: computed<Crumb[]>(() => [
				{ label: 'Wishlist', link: '/wishlist' },
				{ label: album()?.name ?? 'Wish' },
			]),
		};
	}),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			wishlistDetailsEffect = inject(WishlistDetailsEffect)
		) => ({
			/** Follows the `:itemId` route parameter. */
			loadItem: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('itemId') ?? ''),
					tap((itemId) =>
						patchState(store, {
							itemId,
							item: null,
							pressings: [],
							loading: true,
						})
					),
					switchMap((itemId) =>
						wishlistDetailsEffect.load$(itemId).pipe(
							tapResponse({
								next: (details) =>
									patchState(store, {
										...details,
										loading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, { loading: false });
								},
							})
						)
					)
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.loadItem(of(undefined));
		},
	})
);
