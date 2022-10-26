import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	CollectionItemDataService,
	CollectionItemEntity,
	CollectionItemUtilService,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
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
				this.collectionItemDataService.add$(action.collectionItem).pipe(
					map((collectionItem) => {
						return collectionItemActions.addCollectionItemSuccess({
							collectionItem,
						});
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
							collectionItem:
								collectionItem as CollectionItemEntity,
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
				this.collectionItemDataService.search$(action.term).pipe(
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
	public updateCollectionItem = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.updateCollectionItem),
			switchMap((action) =>
				this.collectionItemDataService
					.update$(action.collectionItem)
					.pipe(
						map((collectionItem) => {
							return collectionItemActions.updateCollectionItemSuccess(
								{
									collectionItem: {
										id: collectionItem.uid || '',
										changes: collectionItem,
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
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
