import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	ReleaseDataService,
	ReleaseEntity,
	ReleaseUtilService,
	ArtistDataService,
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
				this.artistDataService
					.addRelease$(
						this.releaseUtilService.convertEntityAddToModelAdd(
							action.release
						)
					)
					.pipe(
						map((release) => {
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.Release
								);

							const releaseEntity: ReleaseEntity =
								this.releaseUtilService.convertModelToEntity(
									release
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.releaseUtilService.updateEntityQuantity(
									entityQuantityEntity,
									releaseEntity
								)
							);

							return releaseActions.addReleaseSuccess({
								release: releaseEntity,
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
					map((releases) =>
						releases.map((release) =>
							this.releaseUtilService.convertModelToEntity(
								release
							)
						)
					),
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
							release: release
								? this.releaseUtilService.convertModelToEntity(
										release
								  )
								: undefined,
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
					map((result) =>
						result.map((release) =>
							this.releaseUtilService.convertModelToEntity(
								release
							)
						)
					),
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
	public selectRelease = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.selectRelease),
			map((action) => {
				return releaseActions.selectReleaseSuccess({
					release: action.release,
				});
			})
		)
	);
	public updateRelease = createEffect(() =>
		this.actions$.pipe(
			ofType(releaseActions.updateRelease),
			switchMap((action) =>
				this.artistDataService
					.updateRelease$(
						this.releaseUtilService.convertEntityUpdateToModelUpdate(
							action.release
						)
					)
					.pipe(
						map((release) => {
							return releaseActions.updateReleaseSuccess({
								release: {
									id: release.uid || '',
									changes:
										this.releaseUtilService.convertModelUpdateToEntityUpdate(
											release
										),
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
		private artistDataService: ArtistDataService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
