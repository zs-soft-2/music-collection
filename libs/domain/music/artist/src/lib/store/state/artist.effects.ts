import { from, of } from 'rxjs';
import {
	catchError,
	concatMap,
	first,
	map,
	mergeMap,
	switchMap,
	take,
	toArray,
} from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumUtilService,
	ArtistDataService,
	ArtistHookService,
	ArtistUtilService,
	EntityQuantityEntity,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as artistActions from './artist.actions';

@Injectable()
export class ArtistEffects {
	private actions$: Actions = inject(Actions);
	private albumUtilService = inject(AlbumUtilService);
	private artistDataService = inject(ArtistDataService);
	private artistHookService = inject(ArtistHookService);
	private artistUtilService = inject(ArtistUtilService);
	private entityQuantityStateService = inject(EntityQuantityStateService);
	private entityQuantityUtilService = inject(EntityQuantityUtilService);

	/**
	 * Writes the albums one after the other, then counts them in the album
	 * quantity (in total and per artist) in one update.
	 */
	public addAlbums = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.addAlbums),
			mergeMap((action) =>
				from(action.albums).pipe(
					concatMap((album) =>
						this.artistDataService
							.addAlbum$(
								this.albumUtilService.convertEntityAddToModelAdd(
									album
								)
							)
							.pipe(take(1))
					),
					map((album) =>
						this.albumUtilService.convertModelToEntity(album)
					),
					toArray(),
					switchMap((albums) =>
						this.entityQuantityStateService
							.selectEntityById$(EntityTypeEnum.Album)
							.pipe(
								first(),
								map((entityQuantityEntity) => {
									this.updateAlbumQuantity(
										entityQuantityEntity,
										albums
									);

									return artistActions.addAlbumsSuccess({
										albums,
									});
								})
							)
					)
				)
			)
		)
	);
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
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.Artist
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.artistUtilService.updateEntityQuantity(
									entityQuantityEntity
								)
							);

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
	public listAlbumsById = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.listAlbumsById),
			switchMap((action) =>
				this.artistDataService.listAlbumsById$(action.uid).pipe(
					map((albums) =>
						albums.map((album) =>
							this.albumUtilService.convertModelToEntity(album)
						)
					),
					map((albums) => {
						return artistActions.listAlbumsByIdSuccess({
							albums,
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
				this.artistDataService.search$(action.params).pipe(
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
	public selectArtist = createEffect(() =>
		this.actions$.pipe(
			ofType(artistActions.selectArtist),
			map((action) => {
				this.artistHookService.selectEntity(action.artist);

				return artistActions.selectArtistSuccess({
					artist: action.artist,
				});
			})
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

	private updateAlbumQuantity(
		entityQuantityEntity: EntityQuantityEntity | undefined,
		albums: AlbumEntity[]
	): void {
		if (!albums.length) {
			return;
		}
		const entityQuantity = albums.reduce(
			(quantity, album) =>
				this.albumUtilService.updateEntityQuantity(
					quantity,
					album
				) as EntityQuantityEntity,
			entityQuantityEntity ||
				this.entityQuantityUtilService.createEntityQuantity(
					EntityTypeEnum.Album
				)
		);

		this.entityQuantityStateService.dispatchUpdateEntityAction(
			entityQuantity
		);
	}
}
