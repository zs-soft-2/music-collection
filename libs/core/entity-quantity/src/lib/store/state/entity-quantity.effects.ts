import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	EntityQuantityDataService,
	EntityQuantityUtilService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as entityQuantityActions from './entity-quantity.actions';

@Injectable()
export class EntityQuantityEffects {
  actions$: Actions = inject(Actions);
	entityQuantityDataService = inject(EntityQuantityDataService);
	entityQuantityUtilService = inject(EntityQuantityUtilService);
	public addEntityQuantity = createEffect(() =>
		this.actions$.pipe(
			ofType(entityQuantityActions.addEntityQuantity),
			switchMap((action) =>
				this.entityQuantityDataService.add$(action.entityQuantity).pipe(
					map((entityQuantity) => {
						return entityQuantityActions.addEntityQuantitySuccess({
							entityQuantity,
						});
					})
				)
			)
		)
	);
	public listEntityQuantitys = createEffect(() =>
		this.actions$.pipe(
			ofType(entityQuantityActions.listEntityQuantities),
			switchMap(() =>
				this.entityQuantityDataService.list$().pipe(
					map((entityQuantities) => {
						return entityQuantityActions.listEntityQuantitiesSuccess(
							{
								entityQuantities,
							}
						);
					})
				)
			)
		)
	);
	public loadEntityQuantity = createEffect(() =>
		this.actions$.pipe(
			ofType(entityQuantityActions.loadEntityQuantity),
			switchMap((action) =>
				this.entityQuantityDataService.load$(action.uid).pipe(
					map((entityQuantity) => {
						return entityQuantityActions.loadEntityQuantitySuccess({
							entityQuantity: entityQuantity,
						});
					}),
					catchError((error) => {
						return of(
							entityQuantityActions.loadEntityQuantityFail(error)
						);
					})
				)
			)
		)
	);
	public searchEntityQuantities = createEffect(() =>
		this.actions$.pipe(
			ofType(entityQuantityActions.search),
			switchMap((action) => {
				return this.entityQuantityDataService
					.search$(action.params)
					.pipe(
						map((entityQuantities) => {
							return entityQuantityActions.searchSuccess({
								result: entityQuantities,
							});
						}),
						catchError((error) => {
							return of(
								entityQuantityActions.searchFailed({
									error: error as string,
								})
							);
						})
					);
			})
		)
	);
	public updateEntityQuantity = createEffect(() =>
		this.actions$.pipe(
			ofType(entityQuantityActions.updateEntityQuantity),
			switchMap((action) =>
				this.entityQuantityDataService
					.update$(action.entityQuantity)
					.pipe(
						map((entityQuantity) => {
							return entityQuantityActions.updateEntityQuantitySuccess(
								{
									entityQuantity: {
										id: entityQuantity.uid || '',
										changes: entityQuantity,
									},
								}
							);
						})
					)
			)
		)
	);
}
