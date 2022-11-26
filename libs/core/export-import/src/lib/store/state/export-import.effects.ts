import { from, of } from 'rxjs';
import {
	catchError,
	concatMap,
	map,
	mergeMap,
	switchMap,
} from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	AlbumUtilService,
	ArtistDataService,
	ArtistEntity,
	ArtistUtilService,
	BaseService,
	DocumentDataService,
	DocumentUtilService,
	UserStateService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as exportImportActions from './export-import.actions';

@Injectable()
export class ExportImportEffects extends BaseService {
	public listAlbumsById = createEffect(() =>
		this.actions$.pipe(
			ofType(exportImportActions.listAlbumsById),
			switchMap((action) =>
				this.artistDataService.listAlbumsById$(action.uid).pipe(
					map((albums) =>
						albums.map((album) =>
							this.albumUtilService.convertModelToEntity(album)
						)
					),
					map((albums) => {
						return exportImportActions.listAlbumsByIdSuccess({
							albums,
						});
					})
				)
			)
		)
	);
	public loadDocument = createEffect(() =>
		this.actions$.pipe(
			ofType(exportImportActions.loadDocument),
			mergeMap((action) =>
				this.documentDataService.load$(action.uid).pipe(
					map((document) => {
						return exportImportActions.loadDocumentSuccess({
							document: document
								? this.documentUtilService.convertModelToEntity(
										document
								  )
								: undefined,
						});
					}),
					catchError((error) => {
						console.log(error);

						return of(exportImportActions.loadDocumentFail(error));
					})
				)
			)
		)
	);

	public updateAlbum = createEffect(() =>
		this.actions$.pipe(
			ofType(exportImportActions.updateAlbum),
			switchMap((action) =>
				this.artistDataService
					.importAlbum$(
						this.albumUtilService.convertEntityToModel(action.album)
					)
					.pipe(
						map((album) => {
							return exportImportActions.updateAlbumSuccess({
								album: this.albumUtilService.convertModelToEntity(
									album
								),
							});
						}),
						catchError((error) => {
							console.log(error);

							return of(
								exportImportActions.updateAlbumFail(error)
							);
						})
					)
			)
		)
	);

	public updateArtist = createEffect(() =>
		this.actions$.pipe(
			ofType(exportImportActions.updateArtist),
			switchMap((action) =>
				this.artistDataService
					.update$(
						this.artistUtilService.convertEntityUpdateToModelUpdate(
							action.artist
						)
					)
					.pipe(
						map((artist) => {
							return exportImportActions.updateArtistSuccess({
								artist: this.artistUtilService.convertModelUpdateToEntityUpdate(
									artist
								) as ArtistEntity,
							});
						})
					)
			)
		)
	);

	public updateDocument = createEffect(() =>
		this.actions$.pipe(
			ofType(exportImportActions.updateDocument),
			switchMap((action) =>
				this.documentDataService
					.add$(
						this.documentUtilService.convertEntityToModel(
							action.document
						)
					)
					.pipe(
						map((document) => {
							return exportImportActions.updateDocumentSuccess({
								document:
									this.documentUtilService.convertModelToEntity(
										document
									),
							});
						})
					)
			)
		)
	);
	public uploadImportFile = createEffect(() =>
		this.actions$.pipe(
			ofType(exportImportActions.uploadImportFile),
			concatMap((action) =>
				this.documentDataService.upload$(action.file).pipe(
					map((filePath) => {
						return exportImportActions.uploadImportFileSuccess({
							name: action.file.path,
							filePath,
						});
					})
				)
			)
		)
	);

	public constructor(
		private actions$: Actions,
		private albumUtilService: AlbumUtilService,
		private artistDataService: ArtistDataService,
		private artistUtilService: ArtistUtilService,
		private documentDataService: DocumentDataService,
		private documentUtilService: DocumentUtilService,
		private userStateService: UserStateService
	) {
		super();
	}
}
