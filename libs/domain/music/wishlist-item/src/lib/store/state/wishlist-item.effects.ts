import { of } from 'rxjs';
import {
	catchError,
	distinctUntilChanged,
	first,
	map,
	switchMap,
} from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	AuthenticationStateService,
	EntityQuantityEntity,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
	UpdateEntityQuantityTypeEnum,
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
	private entityQuantityStateService = inject(EntityQuantityStateService);
	private entityQuantityUtilService = inject(EntityQuantityUtilService);
	private userDataService = inject(UserDataService);
	private wishlistItemDataService = inject(WishlistItemDataService);
	private wishlistItemUtilService = inject(WishlistItemUtilService);

	public addWishlistItem = createEffect(() =>
		this.actions$.pipe(
			ofType(wishlistItemActions.addWishlistItem),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.WishlistItem)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.userDataService
					.addWishlistItem$(
						this.wishlistItemUtilService.convertEntityAddToModelAdd(
							action.wishlistItem
						)
					)
					.pipe(
						map((wishlistItem) => {
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.WishlistItem
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.wishlistItemUtilService.updateEntityQuantity(
									entityQuantityEntity,
									wishlistItem,
									UpdateEntityQuantityTypeEnum.increase
								)
							);

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
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.WishlistItem)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.userDataService
					.deleteWishlistItem$(
						this.wishlistItemUtilService.convertEntityToModel(
							action.wishlistItem
						)
					)
					.pipe(
						map((wishlistItem) => {
							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.wishlistItemUtilService.updateEntityQuantity(
									entityQuantityEntity as EntityQuantityEntity,
									this.wishlistItemUtilService.convertModelToEntity(
										wishlistItem
									),
									UpdateEntityQuantityTypeEnum.decrease
								)
							);

							return wishlistItemActions.deleteWishlistItemSuccess(
								{
									wishlistItemId: wishlistItem.uid,
								}
							);
						}),
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
