import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	ArtistDataService,
	ArtistUtilService,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as artistActions from './artist.actions';

@Injectable()
export class ArtistEffects {
	public addArtist = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.addArtist),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.Artist)
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
					.add$(
						this.artistUtilService.convertEntityAddToModelAdd(
							action.artist
						)
					)
					.pipe(
						map((artist) => {
							return artistActions.addArtistSuccess({
								artist: this.artistUtilService.convertModelToEntity(
									artist
								),
							});
						})
					)
			)
		)
	);
	public listArtists = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.listArtists),
			switchMap(() =>
				this.artistDataService.list$().pipe(
					map((artists) =>
						artists.map((artist) =>
							this.artistUtilService.convertModelToEntity(artist)
						)
					),
					map((artists) => {
						return artistActions.listArtistsSuccess({
							artists,
						});
					})
				)
			)
		)
	);
	public loadArtist = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.loadArtist),
			switchMap((action) =>
				this.artistDataService.load$(action.uid).pipe(
					map((artist) => {
						return artistActions.loadArtistSuccess({
							artist: artist
								? this.artistUtilService.convertModelToEntity(
										artist
								  )
								: undefined,
						});
					}),
					catchError((error) => {
						return of(artistActions.loadArtistFail(error));
					})
				)
			)
		)
	);
	public searchArtists = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.search),
			switchMap((action) =>
				this.artistDataService.search$(action.term).pipe(
					map((result) =>
						result.map((artist) =>
							this.artistUtilService.convertModelToEntity(artist)
						)
					),
					map((result) => {
						return artistActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						return of(artistActions.searchFailed(error));
					})
				)
			)
		)
	);
	public updateArtist = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.updateArtist),
			switchMap((action) =>
				this.artistDataService
					.update$(
						this.artistUtilService.convertEntityUpdateToModelUpdate(
							action.artist
						)
					)
					.pipe(
						map((artist) => {
							return artistActions.updateArtistSuccess({
								artist: {
									id: artist.uid || '',
									changes:
										this.artistUtilService.convertModelUpdateToEntityUpdate(
											artist
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
		private artistDataService: ArtistDataService,
		private artistUtilService: ArtistUtilService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
