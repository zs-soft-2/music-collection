import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
	LabelDataService,
	LabelEntity,
	LabelUtilService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as labelActions from './label.actions';

@Injectable()
export class LabelEffects {
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
				this.labelDataService.add$(action.label).pipe(
					map((label) => {
						return labelActions.addLabelSuccess({
							label,
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
							label: label as LabelEntity,
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
				this.labelDataService.search$(action.term).pipe(
					map((result) => {
						return labelActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						return of(labelActions.searchFailed(error));
					})
				)
			)
		)
	);
	public updateLabel = createEffect(() =>
		this.actions$.pipe(
			ofType(labelActions.updateLabel),
			switchMap((action) =>
				this.labelDataService.update$(action.label).pipe(
					map((label) => {
						return labelActions.updateLabelSuccess({
							label: {
								id: label.uid || '',
								changes: label,
							},
						});
					})
				)
			)
		)
	);

	public constructor(
		private actions$: Actions,
		private labelDataService: LabelDataService,
		private labelUtilService: LabelUtilService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
