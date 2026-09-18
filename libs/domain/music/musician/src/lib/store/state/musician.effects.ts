import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
	MusicianDataService,
	MusicianUtilService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as musicianActions from './musician.actions';

@Injectable()
export class MusicianEffects {
	private actions$: Actions = inject(Actions);
	private entityQuantityStateService = inject(EntityQuantityStateService);
	private entityQuantityUtilService = inject(EntityQuantityUtilService);
	private musicianDataService = inject(MusicianDataService);
	private musicianUtilService = inject(MusicianUtilService);

	public addMusician = createEffect(() =>
		this.actions$.pipe(
			ofType(musicianActions.addMusician),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.Musician)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.musicianDataService
					.add$(
						this.musicianUtilService.convertEntityAddToModelAdd(
							action.musician
						)
					)
					.pipe(
						map((musician) => {
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.Musician
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.musicianUtilService.updateEntityQuantity(
									entityQuantityEntity
								)
							);

							return musicianActions.addMusicianSuccess({
								musician:
									this.musicianUtilService.convertModelToEntity(
										musician
									),
							});
						})
					)
			)
		)
	);
	public listMusicians = createEffect(() =>
		this.actions$.pipe(
			ofType(musicianActions.listMusicians),
			switchMap(() =>
				this.musicianDataService.list$().pipe(
					map((musicians) =>
						musicians.map((musician) =>
							this.musicianUtilService.convertModelToEntity(
								musician
							)
						)
					),
					map((musicians) => {
						return musicianActions.listMusiciansSuccess({
							musicians,
						});
					})
				)
			)
		)
	);
	public loadMusician = createEffect(() =>
		this.actions$.pipe(
			ofType(musicianActions.loadMusician),
			switchMap((action) =>
				this.musicianDataService.load$(action.uid).pipe(
					map((musician) => {
						return musicianActions.loadMusicianSuccess({
							musician: musician
								? this.musicianUtilService.convertModelToEntity(
										musician
									)
								: undefined,
						});
					}),
					catchError((error) => {
						return of(musicianActions.loadMusicianFail(error));
					})
				)
			)
		)
	);
	public searchMusicians = createEffect(() =>
		this.actions$.pipe(
			ofType(musicianActions.search),
			switchMap((action) =>
				this.musicianDataService.search$(action.params).pipe(
					map((result) =>
						result.map((musician) =>
							this.musicianUtilService.convertModelToEntity(
								musician
							)
						)
					),
					map((result) => {
						return musicianActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						console.error(error);

						return of(musicianActions.searchFailed(error));
					})
				)
			)
		)
	);
	public selectMusician = createEffect(() =>
		this.actions$.pipe(
			ofType(musicianActions.selectMusician),
			map((action) => {
				return musicianActions.selectMusicianSuccess({
					musician: action.musician,
				});
			})
		)
	);
	public updateMusician = createEffect(() =>
		this.actions$.pipe(
			ofType(musicianActions.updateMusician),
			switchMap((action) =>
				this.musicianDataService
					.update$(
						this.musicianUtilService.convertEntityUpdateToModelUpdate(
							action.musician
						)
					)
					.pipe(
						map((musician) => {
							return musicianActions.updateMusicianSuccess({
								musician: {
									id: musician.uid || '',
									changes:
										this.musicianUtilService.convertModelUpdateToEntityUpdate(
											musician
										),
								},
							});
						})
					)
			)
		)
	);
}
