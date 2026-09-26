import { of } from 'rxjs';
import {
	catchError,
	distinctUntilChanged,
	map,
	switchMap,
} from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	AnalyticsService,
	AuthenticationStateService,
	UserDataService,
	WishlistItemDataService,
	WishlistItemUtilService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as wishlistItemActions from './wishlist-item.actions';

@Injectable()
export class WishlistItemEffects {
	private actions$: Actions = inject(Actions);
	private authenticationStateService = inject(AuthenticationStateService);
	private analytics = inject(AnalyticsService);
	private userDataService = inject(UserDataService);
	private wishlistItemDataService = inject(WishlistItemDataService);
	private wishlistItemUtilService = inject(WishlistItemUtilService);

	/**
	 * No stored count is kept for wished albums, here or on removal: the
	 * pages count them live (see `ENTITY_COUNT_COLLECTIONS`), and the shared
	 * `entity-quantity` counter is the admin's to write, not a collector's.
	 */
	public addWishlistItem = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.addWishlistItem),
			switchMap((action) =>
				this.userDataService
					.addWishlistItem$(
						this.wishlistItemUtilService.convertEntityAddToModelAdd(
							action.wishlistItem
						)
					)
					.pipe(
						map((wishlistItem) => {
							// How many pressings of it would do: a record wanted
							// on vinyl only is a different want from one that
							// any copy would settle.
							this.analytics.track('add_to_wishlist', {
								medias: wishlistItem.medias.length,
							});

							return wishlistItemActions.addWishlistItemSuccess({
								wishlistItem:
									this.wishlistItemUtilService.convertModelToEntity(
										wishlistItem
									),
							});
						}),
						catchError((error) => {
							console.error(error);

							return of(
								wishlistItemActions.addWishlistItemFail({
									error,
								})
							);
						})
					)
			)
		)
	);
	public deleteRelease = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.deleteWishlistItem),
			switchMap((action) =>
				this.userDataService
					.deleteWishlistItem$(
						this.wishlistItemUtilService.convertEntityToModel(
							action.wishlistItem
						)
					)
					.pipe(
						map((wishlistItem) =>
							wishlistItemActions.deleteWishlistItemSuccess({
								wishlistItemId: wishlistItem.uid,
							})
						),
						catchError((error) => {
							console.error(error);

							return of(
								wishlistItemActions.deleteWishlistItemFail({
									error,
								})
							);
						})
					)
			)
		)
	);
	public listWishlistItems = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.listWishlistItems),
			switchMap(() =>
				this.wishlistItemDataService.list$().pipe(
					map((wishlistItems) =>
						wishlistItems.map((wishlistItem) =>
							this.wishlistItemUtilService.convertModelToEntity(
								wishlistItem
							)
						)
					),
					map((wishlistItems) => {
						return wishlistItemActions.listWishlistItemsSuccess({
							wishlistItems,
						});
					}),
					catchError((error) => {
						console.error(error);

						return of(
							wishlistItemActions.listWishlistItemsFail({ error })
						);
					})
				)
			)
		)
	);
	/** The signed-in user's own wishlist; a guest has none. */
	public listOwnWishlistItems = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.listOwnWishlistItems),
			switchMap(() =>
				this.authenticationStateService.selectAuthenticatedUser$()
			),
			map((user) => user?.uid ?? ''),
			distinctUntilChanged(),
			switchMap((userId) =>
				(userId
					? this.wishlistItemDataService.listByUser$(userId)
					: of([])
				).pipe(
					map((wishlistItems) =>
						wishlistItems.map((wishlistItem) =>
							this.wishlistItemUtilService.convertModelToEntity(
								wishlistItem
							)
						)
					),
					map((wishlistItems) =>
						wishlistItemActions.listWishlistItemsSuccess({
							wishlistItems,
						})
					),
					catchError((error) => {
						console.error(error);

						return of(
							wishlistItemActions.listWishlistItemsFail({ error })
						);
					})
				)
			)
		)
	);
	public loadWishlistItem = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.loadWishlistItem),
			switchMap((action) =>
				this.wishlistItemDataService.load$(action.uid).pipe(
					map((wishlistItem) => {
						return wishlistItemActions.loadWishlistItemSuccess({
							wishlistItem: wishlistItem
								? this.wishlistItemUtilService.convertModelToEntity(
										wishlistItem
									)
								: undefined,
						});
					}),
					catchError((error) => {
						return of(
							wishlistItemActions.loadWishlistItemFail(error)
						);
					})
				)
			)
		)
	);
	public searchWishlistItems = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.search),
			switchMap((action) =>
				this.wishlistItemDataService.search$(action.params).pipe(
					map((result) =>
						result.map((wishlistItem) =>
							this.wishlistItemUtilService.convertModelToEntity(
								wishlistItem
							)
						)
					),
					map((result) => {
						return wishlistItemActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						console.error(error);

						return of(wishlistItemActions.searchFailed(error));
					})
				)
			)
		)
	);
	public selectWishlistItem = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.selectWishlistItem),
			map((action) => {
				return wishlistItemActions.selectWishlistItemSuccess({
					wishlistItem: action.wishlistItem,
				});
			})
		)
	);
	public updateWishlistItem = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.updateWishlistItem),
			switchMap((action) =>
				this.userDataService
					.updateWishlistItem$(
						this.wishlistItemUtilService.convertEntityUpdateToModelUpdate(
							action.wishlistItem
						)
					)
					.pipe(
						map((wishlistItem) => {
							return wishlistItemActions.updateWishlistItemSuccess(
								{
									wishlistItem: {
										id: wishlistItem.uid || '',
										changes:
											this.wishlistItemUtilService.convertModelUpdateToEntityUpdate(
												wishlistItem
											),
									},
								}
							);
						}),
						catchError((error) => {
							console.error(error);

							return of(
								wishlistItemActions.updateWishlistItemFail({
									error,
								})
							);
						})
					)
			)
		)
	);
}
