import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	ReleaseDataService,
	ReleaseEntity,
	ReleaseUtilService,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as releaseActions from './release.actions';

@Injectable()
export class ReleaseEffects {
	public addRelease = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.addRelease),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.Release)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.releaseDataService.add$(action.release).pipe(
					map((release) => {
						return releaseActions.addReleaseSuccess({
							release,
						});
					})
				)
			)
		)
	);
	public listReleases = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.listReleases),
			switchMap(() =>
				this.releaseDataService.list$().pipe(
					map((releases) => {
						return releaseActions.listReleasesSuccess({
							releases,
						});
					})
				)
			)
		)
	);
	public loadRelease = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.loadRelease),
			switchMap((action) =>
				this.releaseDataService.load$(action.uid).pipe(
					map((release) => {
						return releaseActions.loadReleaseSuccess({
							release: release as ReleaseEntity,
						});
					}),
					catchError((error) => {
						return of(releaseActions.loadReleaseFail(error));
					})
				)
			)
		)
	);
	public searchReleases = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.search),
			switchMap((action) =>
				this.releaseDataService.search$(action.term).pipe(
					map((result) => {
						return releaseActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						return of(releaseActions.searchFailed(error));
					})
				)
			)
		)
	);
	public updateRelease = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.updateRelease),
			switchMap((action) =>
				this.releaseDataService.update$(action.release).pipe(
					map((release) => {
						return releaseActions.updateReleaseSuccess({
							release: {
								id: release.uid || '',
								changes: release,
							},
						});
					})
				)
			)
		)
	);

	public constructor(
		private actions$: Actions,
		private releaseDataService: ReleaseDataService,
		private releaseUtilService: ReleaseUtilService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
