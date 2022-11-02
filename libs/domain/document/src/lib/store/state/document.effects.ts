import { of } from 'rxjs';
import { catchError, first, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	DocumentDataService,
	DocumentEntity,
	DocumentUtilService,
	EntityQuantityStateService,
	EntityQuantityUtilService,
	EntityTypeEnum,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as documentActions from './document.actions';

@Injectable()
export class DocumentEffects {
	public addDocument = createEffect(() =>
		this.actions$.pipe(
			ofType(documentActions.addDocument),
			switchMap((action) =>
				this.entityQuantityStateService
					.selectEntityById$(EntityTypeEnum.Document)
					.pipe(
						map((entityQuantityEntity) => ({
							action,
							entityQuantityEntity,
						})),
						first()
					)
			),
			switchMap(({ action, entityQuantityEntity }) =>
				this.documentDataService
					.add$(
						this.documentUtilService.convertEntityAddToModelAdd(
							action.document
						)
					)
					.pipe(
						map((document) => {
							entityQuantityEntity =
								entityQuantityEntity ||
								this.entityQuantityUtilService.createEntityQuantity(
									EntityTypeEnum.Document
								);

							this.entityQuantityStateService.dispatchUpdateEntityAction(
								this.documentUtilService.updateEntityQuantity(
									entityQuantityEntity
								)
							);

							return documentActions.addDocumentSuccess({
								document,
							});
						})
					)
			)
		)
	);
	public listDocuments = createEffect(() =>
		this.actions$.pipe(
			ofType(documentActions.listDocuments),
			switchMap(() =>
				this.documentDataService.list$().pipe(
					map((documents) =>
						documents.map((document) =>
							this.documentUtilService.convertModelToEntity(
								document
							)
						)
					),
					map((documents) => {
						return documentActions.listDocumentsSuccess({
							documents,
						});
					})
				)
			)
		)
	);
	public loadDocument = createEffect(() =>
		this.actions$.pipe(
			ofType(documentActions.loadDocument),
			switchMap((action) =>
				this.documentDataService.load$(action.uid).pipe(
					map((document) => {
						return documentActions.loadDocumentSuccess({
							document: document
								? this.documentUtilService.convertModelToEntity(
										document
								  )
								: undefined,
						});
					}),
					catchError((error) => {
						return of(documentActions.loadDocumentFail(error));
					})
				)
			)
		)
	);
	public searchDocuments = createEffect(() =>
		this.actions$.pipe(
			ofType(documentActions.search),
			switchMap((action) =>
				this.documentDataService.search$(action.term).pipe(
					map((result) =>
						result.map((document) =>
							this.documentUtilService.convertModelToEntity(
								document
							)
						)
					),
					map((result) => {
						return documentActions.searchSuccess({
							result,
						});
					}),
					catchError((error) => {
						return of(documentActions.searchFailed(error));
					})
				)
			)
		)
	);
	public updateDocument = createEffect(() =>
		this.actions$.pipe(
			ofType(documentActions.updateDocument),
			switchMap((action) =>
				this.documentDataService
					.update$(
						this.documentUtilService.convertEntityUpdateToModelUpdate(
							action.document
						)
					)
					.pipe(
						map((document) => {
							return documentActions.updateDocumentSuccess({
								document: {
									id: document.uid || '',
									changes:
										this.documentUtilService.convertModelUpdateToEntityUpdate(
											document
										),
								},
							});
						})
					)
			)
		)
	);
	public uploadFile = createEffect(() =>
		this.actions$.pipe(
			ofType(documentActions.uploadFile),
			switchMap((action) =>
				this.documentDataService.upload$(action.file).pipe(
					map((filePath) => {
						return documentActions.uploadFileSuccess({
							filePath,
						});
					})
				)
			)
		)
	);

	public constructor(
		private actions$: Actions,
		private documentDataService: DocumentDataService,
		private documentUtilService: DocumentUtilService,
		private entityQuantityStateService: EntityQuantityStateService,
		private entityQuantityUtilService: EntityQuantityUtilService
	) {}
}
