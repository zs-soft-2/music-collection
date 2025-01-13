import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
	LabelDataService,
	LabelUtilService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as labelActions from './label.actions';

@Injectable()
export class LabelEffects {
	private actions$: Actions = inject(Actions);
	private entityQuantityStateService = inject(EntityQuantityStateService);
	private entityQuantityUtilService = inject(EntityQuantityUtilService);
	private labelDataService = inject(LabelDataService);
	private labelUtilService = inject(LabelUtilService);

	public addLabel = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.addLabel),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.Label)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.labelDataService
					.add$(
						this.labelUtilService.convertEntityAddToModelAdd(
							action.label
						)
					)
					.pipe(
						map((label) => {
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.Label
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.labelUtilService.updateEntityQuantity(
									entityQuantityEntity
								)
							);

							return labelActions.addLabelSuccess({
								label: this.labelUtilService.convertModelToEntity(
									label
								),
							});
						})
					)
			)
		)
	);
	public listLabels = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.listLabels),
			switchMap(() =>
				this.labelDataService.list$().pipe(
					map((labels) =>
						labels.map((label) =>
							this.labelUtilService.convertModelToEntity(label)
						)
					),
					map((labels) => {
						return labelActions.listLabelsSuccess({
							labels,
						});
					})
				)
			)
		)
	);
	public loadLabel = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.loadLabel),
			switchMap((action) =>
				this.labelDataService.load$(action.uid).pipe(
					map((label) => {
						return labelActions.loadLabelSuccess({
							label: label
								? this.labelUtilService.convertModelToEntity(
										label
								  )
								: undefined,
						});
					}),
					catchError((error) => {
						return of(labelActions.loadLabelFail(error));
					})
				)
			)
		)
	);
	public searchLabels = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.search),
			switchMap((action) =>
				this.labelDataService.search$(action.params).pipe(
					map((result) =>
						result.map((label) =>
							this.labelUtilService.convertModelToEntity(label)
						)
					),
					map((result) => {
						return labelActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						console.error(error);

						return of(labelActions.searchFailed(error));
					})
				)
			)
		)
	);
	public selectLabel = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.selectLabel),
			map((action) => {
				return labelActions.selectLabelSuccess({
					label: action.label,
				});
			})
		)
	);
	public updateLabel = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.updateLabel),
			switchMap((action) =>
				this.labelDataService
					.update$(
						this.labelUtilService.convertEntityUpdateToModelUpdate(
							action.label
						)
					)
					.pipe(
						map((label) => {
							return labelActions.updateLabelSuccess({
								label: {
									id: label.uid || '',
									changes:
										this.labelUtilService.convertModelUpdateToEntityUpdate(
											label
										),
								},
							});
						})
					)
			)
		)
	);
}
