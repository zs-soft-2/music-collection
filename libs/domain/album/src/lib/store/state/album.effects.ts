import {
  EntityQuantityStateService,
  EntityQuantityUtilService,
} from 'libs/api/src/lib/core/entity-quantity';
import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
  AlbumDataService,
  AlbumEntity,
  AlbumUtilService,
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
        this.albumDataService.add$(action.album).pipe(
          map((album) => {
            return albumActions.addAlbumSuccess({
              album,
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
              album: album as AlbumEntity,
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
      switchMap((action) => {
        return of(albumActions.searchSuccess({ result: [] }));
      })
    )
  );
  public updateAlbum = createEffect(() =>
    this.actions$.pipe(
      ofType(albumActions.updateAlbum),
      switchMap((action) =>
        this.albumDataService.update$(action.album).pipe(
          map((album) => {
            return albumActions.updateAlbumSuccess({
              album: {
                id: album.uid || '',
                changes: album,
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
    private albumUtilService: AlbumUtilService,
    private entityQuantityStateService: EntityQuantityStateService,
    private entityQuantityUtilService: EntityQuantityUtilService
  ) {}
}
