import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	AlbumDataService,
	AlbumHookService,
	AlbumUtilService,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as albumActions from './album.actions';

@Injectable()
export class AlbumEffects {
	public addAlbum = createEffect(() =>
		this.actions$.pipe(
			ofType(albumActions.addAlbum),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.Album)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.albumDataService
					.add$(
						this.albumUtilService.convertEntityAddToModelAdd(
							action.album
						)
					)
					.pipe(
						map((album) => {
							return albumActions.addAlbumSuccess({
								album: this.albumUtilService.convertModelToEntity(
									album
								),
							});
						})
					)
			)
		)
	);
	public listAlbums = createEffect(() =>
		this.actions$.pipe(
			ofType(albumActions.listAlbums),
			switchMap(() =>
				this.albumDataService.list$().pipe(
					map((albums) =>
						albums.map((album) =>
							this.albumUtilService.convertModelToEntity(album)
						)
					),
					map((albums) => {
						return albumActions.listAlbumsSuccess({
							albums,
						});
					})
				)
			)
		)
	);
	public loadAlbum = createEffect(() =>
		this.actions$.pipe(
			ofType(albumActions.loadAlbum),
			switchMap((action) =>
				this.albumDataService.load$(action.uid).pipe(
					map((album) => {
						return albumActions.loadAlbumSuccess({
							album: album
								? this.albumUtilService.convertModelToEntity(
										album
								  )
								: undefined,
						});
					}),
					catchError((error) => {
						return of(albumActions.loadAlbumFail(error));
					})
				)
			)
		)
	);
	public searchAlbums = createEffect(() =>
		this.actions$.pipe(
			ofType(albumActions.search),
			switchMap((action) =>
				this.albumDataService.search$(action.term).pipe(
					map((result) =>
						result.map((album) =>
							this.albumUtilService.convertModelToEntity(album)
						)
					),
					map((result) => {
						return albumActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						return of(albumActions.searchFailed(error));
					})
				)
			)
		)
	);
	public selectAlbum = createEffect(() =>
		this.actions$.pipe(
			ofType(albumActions.selectAlbum),
			map((action) => {
				this.albumHookService.selectEntity(action.album);

				return albumActions.selectAlbumSuccess({
					album: action.album,
				});
			})
		)
	);
	public updateAlbum = createEffect(() =>
		this.actions$.pipe(
			ofType(albumActions.updateAlbum),
			switchMap((action) =>
				this.albumDataService
					.update$(
						this.albumUtilService.convertEntityUpdateToModelUpdate(
							action.album
						)
					)
					.pipe(
						map((album) => {
							return albumActions.updateAlbumSuccess({
								album: {
									id: album.uid || '',
									changes:
										this.albumUtilService.convertModelUpdateToEntityUpdate(
											album
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
		private albumDataService: AlbumDataService,
		private albumHookService: AlbumHookService,
		private albumUtilService: AlbumUtilService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
