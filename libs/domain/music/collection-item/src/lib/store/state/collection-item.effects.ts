import { of } from 'rxjs';
import {
	catchError,
	distinctUntilChanged,
	first,
	map,
	mergeMap,
	switchMap,
} from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	AnalyticsService,
	AuthenticationStateService,
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
	private actions$: Actions = inject(Actions);
	private collectionItemDataService = inject(CollectionItemDataService);
	private collectionItemUtilService = inject(CollectionItemUtilService);
	private entityQuantityStateService = inject(EntityQuantityStateService);
	private entityQuantityUtilService = inject(EntityQuantityUtilService);
	private userDataService = inject(UserDataService);
	private authenticationStateService = inject(AuthenticationStateService);
	private analytics = inject(AnalyticsService);

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

							// What was added, and on what it plays: the media
							// is a closed list, so it says which shelves fill
							// up without saying whose they are.
							this.analytics.track('add_to_collection', {
								media: collectionItemEntity.release.media,
							});

							return collectionItemActions.addCollectionItemSuccess(
								{
									collectionItem: collectionItemEntity,
								}
							);
						}),
						catchError((error) => {
							console.error(error);
							return of(
								collectionItemActions.addCollectionItemFail({
									error,
								})
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
	/**
	 * Disposes of a copy or restores it. The item is kept either way; only
	 * the owned ones count.
	 */
	public changeCollectionItemDisposal = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.changeCollectionItemDisposal),
			mergeMap(({ collectionItem, disposal }) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.CollectionItem)
					.pipe(
						first(),
						switchMap((entityQuantityEntity) =>
							this.userDataService
								.updateCollectionItem$({
									uid: collectionItem.uid,
									entityType: collectionItem.entityType,
									userId: collectionItem.userId,
									disposal,
								})
								.pipe(
									first(),
									map(({ updatedAt }) => {
										this.entityQuantityStateService.dispatchUpdateEntityAction(
											this.collectionItemUtilService.updateEntityQuantity(
												entityQuantityEntity ||
													this.entityQuantityUtilService.createEntityQuantity(
														EntityTypeEnum.CollectionItem
													),
												collectionItem,
												disposal
													? UpdateEntityQuantityTypeEnum.decrease
													: UpdateEntityQuantityTypeEnum.increase
											)
										);

										return collectionItemActions.changeCollectionItemDisposalSuccess(
											{
												collectionItem: {
													id: collectionItem.uid,
													changes: {
														disposal,
														updatedAt,
													},
												},
											}
										);
									})
								)
						),
						catchError((error) => {
							console.error(error);
							return of(
								collectionItemActions.changeCollectionItemDisposalFail(
									{ error }
								)
							);
						})
					)
			)
		)
	);
	/**
	 * Writes what the collector tells about the copy. Like a placement, this
	 * changes nothing about what is owned, so no count is touched — and the
	 * whole telling goes in one write, so the page and the record agree even
	 * when a field was emptied.
	 */
	public changeCollectionItemDetails = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.changeCollectionItemDetails),
			mergeMap(({ collectionItem, details }) =>
				this.userDataService
					.updateCollectionItem$({
						uid: collectionItem.uid,
						entityType: collectionItem.entityType,
						userId: collectionItem.userId,
						...details,
					})
					.pipe(
						first(),
						map(({ updatedAt }) =>
							collectionItemActions.changeCollectionItemDetailsSuccess(
								{
									collectionItem: {
										id: collectionItem.uid,
										changes: { ...details, updatedAt },
									},
								}
							)
						),
						catchError((error) => {
							console.error(error);
							return of(
								collectionItemActions.changeCollectionItemDetailsFail(
									{ error }
								)
							);
						})
					)
			)
		)
	);

	/**
	 * Writes the list of photos. The pictures are already uploaded; a write
	 * that fails here leaves them in Storage unreferenced, which costs a few
	 * kilobytes and is the harmless half of the two ways this can go wrong.
	 */
	public changeCollectionItemPhotos = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.changeCollectionItemPhotos),
			mergeMap(({ collectionItem, photos }) =>
				this.userDataService
					.updateCollectionItem$({
						uid: collectionItem.uid,
						entityType: collectionItem.entityType,
						userId: collectionItem.userId,
						photos,
					})
					.pipe(
						first(),
						map(({ updatedAt }) => {
							this.analytics.track('copy_photos_changed', {
								count: photos.length,
							});

							return collectionItemActions.changeCollectionItemPhotosSuccess(
								{
									collectionItem: {
										id: collectionItem.uid,
										changes: { photos, updatedAt },
									},
								}
							);
						}),
						catchError((error) => {
							console.error(error);
							return of(
								collectionItemActions.changeCollectionItemPhotosFail(
									{ error }
								)
							);
						})
					)
			)
		)
	);

	/**
	 * Files a copy into a compartment of the drawn shelf, or takes the place
	 * back with `null`. Only the place moves: nothing here changes what the
	 * collector owns, so no count is touched.
	 */
	public changeCollectionItemPlacement = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.changeCollectionItemPlacement),
			mergeMap(({ collectionItem, placement }) =>
				this.userDataService
					.updateCollectionItem$({
						uid: collectionItem.uid,
						entityType: collectionItem.entityType,
						userId: collectionItem.userId,
						placement,
					})
					.pipe(
						first(),
						map(({ updatedAt }) => {
							this.analytics.track('shelf_placement_changed', {
								placed: !!placement,
							});

							return collectionItemActions.changeCollectionItemPlacementSuccess(
								{
									collectionItem: {
										id: collectionItem.uid,
										changes: { placement, updatedAt },
									},
								}
							);
						}),
						catchError((error) => {
							console.error(error);
							return of(
								collectionItemActions.changeCollectionItemPlacementFail(
									{ error }
								)
							);
						})
					)
			)
		)
	);

	/**
	 * Files several copies in one batch: rearranging a compartment moves
	 * every record in it, and a half-written compartment would leave two
	 * records standing in the same place.
	 */
	public changeCollectionItemPlacements = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.changeCollectionItemPlacements),
			mergeMap(({ placements }) =>
				this.userDataService
					.updateCollectionItems$(
						placements.map(({ collectionItem, placement }) => ({
							uid: collectionItem.uid,
							entityType: collectionItem.entityType,
							userId: collectionItem.userId,
							placement,
						}))
					)
					.pipe(
						first(),
						map((updated) =>
							collectionItemActions.changeCollectionItemPlacementsSuccess(
								{
									collectionItems: updated.map(
										({ uid, placement, updatedAt }) => ({
											id: uid,
											changes: { placement, updatedAt },
										})
									),
								}
							)
						),
						catchError((error) => {
							console.error(error);
							return of(
								collectionItemActions.changeCollectionItemPlacementsFail(
									{ error }
								)
							);
						})
					)
			)
		)
	);

	public listCollectionItems = createEffect(() =>
		this.actions$.pipe(
			ofType(collectionItemActions.listCollectionItems),
			// The signed-in user's collection; a guest has none. Follows
			// sign-in and sign-out.
			switchMap(() =>
				this.authenticationStateService.selectAuthenticatedUser$()
			),
			map((user) => user?.uid ?? ''),
			distinctUntilChanged(),
			switchMap((userId) =>
				(userId
					? this.collectionItemDataService.listByUser$(userId)
					: of([])
				).pipe(
					map((collectionItems) =>
						collectionItems.map((collectionItem) =>
							this.collectionItemUtilService.convertModelToEntity(
								collectionItem
							)
						)
					),
					map((collectionItems) =>
						collectionItemActions.listCollectionItemsSuccess({
							collectionItems,
						})
					),
					catchError((error) => {
						console.error(error);
						return of(
							collectionItemActions.listCollectionItemsFail({
								error,
							})
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
}
