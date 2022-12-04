import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	CollectionItemDataService,
	CollectionItemEntity,
	CollectionItemUtilService,
	EntityQuantityEntity,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
	UpdateEntityQuantityTypeEnum,
	UserDataService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as collectionItemActions from './collection-item.actions';

@Injectable()
export class CollectionItemEffects {
	public addCollectionItem = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.addCollectionItem),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.CollectionItem)
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
					.addCollectionItem$(
						this.collectionItemUtilService.convertEntityAddToModelAdd(
							action.collectionItem
						)
					)
					.pipe(
						map((collectionItem) => {
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.CollectionItem
								);

							const collectionItemEntity: CollectionItemEntity =
								this.collectionItemUtilService.convertModelToEntity(
									collectionItem
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.collectionItemUtilService.updateEntityQuantity(
									entityQuantityEntity,
									collectionItemEntity,
									UpdateEntityQuantityTypeEnum.increase
								)
							);

							return collectionItemActions.addCollectionItemSuccess(
								{
									collectionItem: collectionItemEntity,
								}
							);
						})
					)
			)
		)
	);
	public deleteCollectionItem = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.deleteCollectionItem),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.CollectionItem)
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
					.deleteCollectionItem$(
						this.collectionItemUtilService.convertEntityToModel(
							action.collectionItem
						)
					)
					.pipe(
						map((collectionItem) => {
							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.collectionItemUtilService.updateEntityQuantity(
									entityQuantityEntity as EntityQuantityEntity,
									this.collectionItemUtilService.convertModelToEntity(
										collectionItem
									),
									UpdateEntityQuantityTypeEnum.decrease
								)
							);

							return collectionItemActions.deleteCollectionItemSuccess(
								{
									collectionItemId: collectionItem.uid,
								}
							);
						})
					)
			)
		)
	);
	public listCollectionItems = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.listCollectionItems),
			switchMap(() =>
				this.collectionItemDataService.list$().pipe(
					map((collectionItems) =>
						collectionItems.map((collectionItem) =>
							this.collectionItemUtilService.convertModelToEntity(
								collectionItem
							)
						)
					),
					map((collectionItems) => {
						return collectionItemActions.listCollectionItemsSuccess(
							{
								collectionItems,
							}
						);
					})
				)
			)
		)
	);
	public loadCollectionItem = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.loadCollectionItem),
			switchMap((action) =>
				this.collectionItemDataService.load$(action.uid).pipe(
					map((collectionItem) => {
						return collectionItemActions.loadCollectionItemSuccess({
							collectionItem: collectionItem
								? this.collectionItemUtilService.convertModelToEntity(
										collectionItem
								  )
								: undefined,
						});
					}),
					catchError((error) => {
						return of(
							collectionItemActions.loadCollectionItemFail(error)
						);
					})
				)
			)
		)
	);
	public searchCollectionItems = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.search),
			switchMap((action) =>
				this.collectionItemDataService.search$(action.params).pipe(
					map((result) =>
						result.map((collectionItem) =>
							this.collectionItemUtilService.convertModelToEntity(
								collectionItem
							)
						)
					),
					map((result) => {
						return collectionItemActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						return of(collectionItemActions.searchFailed(error));
					})
				)
			)
		)
	);
	public selectCollectionItem = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.selectCollectionItem),
			map((action) => {
				return collectionItemActions.selectCollectionItemSuccess({
					collectionItem: action.collectionItem,
				});
			})
		)
	);
	public updateCollectionItem = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.updateCollectionItem),
			switchMap((action) =>
				this.userDataService
					.updateCollectionItem$(
						this.collectionItemUtilService.convertEntityUpdateToModelUpdate(
							action.collectionItem
						)
					)
					.pipe(
						map((collectionItem) => {
							return collectionItemActions.updateCollectionItemSuccess(
								{
									collectionItem: {
										id: collectionItem.uid || '',
										changes:
											this.collectionItemUtilService.convertModelUpdateToEntityUpdate(
												collectionItem
											),
									},
								}
							);
						})
					)
			)
		)
	);

	public constructor(
		private actions$: Actions,
		private collectionItemDataService: CollectionItemDataService,
		private collectionItemUtilService: CollectionItemUtilService,
		private userDataService: UserDataService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
