import { combineLatest, pairwise, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	EntityTypeEnum,
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemStateService,
	toAlbumReference,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	type,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import type { WishlistDraft } from '../album.mapper';
import { albumOf } from './album-page.helpers';

interface AlbumWishlistState {
	/** The signed-in user's wanted albums (all albums). */
	wishlistItems: WishlistItemEntity[];
	wishlistOpen: boolean;
	wishing: boolean;
	wishError: string | null;
}

const initialState: AlbumWishlistState = {
	wishlistItems: [],
	wishlistOpen: false,
	wishing: false,
	wishError: null,
};

/** The item that says this user still wants this album, if any. */
function isWanted(
	item: WishlistItemEntity,
	userId: string | null,
	albumId: string | null
): boolean {
	return (
		item.userReference?.uid === userId &&
		item.albumReference?.uid === albumId &&
		item.isActive !== false
	);
}

/**
 * Wanting the album shown: whether it is on the collector's wishlist
 * already, and the dialog that puts it there.
 */
export function withAlbumWishlist() {
	return signalStoreFeature(
		{
			state: type<{
				albumId: string | null;
				albums: AlbumEntity[];
				userId: string | null;
				userName: string | null;
				canWish: boolean;
			}>(),
		},
		withState(initialState),
		withComputed((store) => ({
			/** This album on the signed-in user's wishlist, still wanted. */
			wanted: computed(() => {
				const userId = store.userId();
				const albumId = store.albumId();

				return (
					store
						.wishlistItems()
						.find((item) => isWanted(item, userId, albumId)) ?? null
				);
			}),
		})),
		withMethods(
			(
				store,
				wishlistItemStateService = inject(WishlistItemStateService)
			) => ({
				/** The signed-in user's wanted albums; follows sign-in. */
				loadWishlist: rxMethod<void>(
					pipe(
						tap(() =>
							wishlistItemStateService.dispatchListOwnEntitiesAction()
						),
						switchMap(() =>
							wishlistItemStateService.selectEntities$().pipe(
								tapResponse({
									next: (wishlistItems) =>
										patchState(store, { wishlistItems }),
									error: (error) => console.error(error),
								})
							)
						)
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
					const album = albumOf(store.albums(), store.albumId());
					const userId = store.userId();

					if (
						!album ||
						!userId ||
						!store.canWish() ||
						store.wishing()
					) {
						return;
					}
					if (
						store
							.wishlistItems()
							.some((item) => isWanted(item, userId, album.uid))
					) {
						patchState(store, {
							wishError:
								'This album is already on your wishlist.',
						});
						return;
					}

					const wishlistItem: WishlistItemEntityAdd = {
						entityType: EntityTypeEnum.WishlistItem,
						albumReference: toAlbumReference(album),
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
					wishlistItemStateService.dispatchAddEntityAction(
						wishlistItem
					);
				},
				openWishlist(): void {
					patchState(store, { wishlistOpen: true, wishError: null });
				},
				closeWishlist(): void {
					patchState(store, { wishlistOpen: false });
				},
			})
		)
	);
}
