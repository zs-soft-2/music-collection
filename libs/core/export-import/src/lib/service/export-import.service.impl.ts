import { saveAs } from 'file-saver';
import {
	combineLatest,
	filter,
	forkJoin,
	from,
	map,
	Observable,
	of,
	ReplaySubject,
	switchMap,
} from 'rxjs';
import { first, mergeMap, reduce, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumExportModel,
	ArtistEntity,
	ArtistExportModel,
	ArtistExportModelWithAlbums,
	ArtistImportModel,
	DocumentEntity,
	DocumentExportModel,
	DocumentFile,
	DocumentImportModel,
	Entity,
	ExportImportService,
	ExportImportStateService,
	ExportImportUtilService,
} from '@music-collection/api';

@Injectable()
export class ExportImportServiceImpl extends ExportImportService {
	public constructor(
		private exportImportStateService: ExportImportStateService,
		private exportImportUtilService: ExportImportUtilService
	) {
		super();
	}

	public createArtistExport(artist: ArtistEntity): Observable<boolean> {
		const artistId = artist.uid;

		this.exportImportStateService.dispatchListAlbumsByIdAction(artistId);

		return combineLatest([
			this.createDocumentExport(artist.headerImage),
			this.createDocumentExport(artist.mainImage),
			this.exportImportStateService.selectAlbums$().pipe(
				filter((albums) => !!albums),
				first(),
				switchMap((albums) => {
					if (albums) {
						return this.createAlbumExports(albums);
					} else {
						return of([]);
					}
				})
			),
		]).pipe(
			map(
				([
					headerImageDocument,
					mainImageDocument,
					albumExportModels,
				]) => {
					const artistExportModel =
						this.exportImportUtilService.createArtistExportModel(
							artist,
							headerImageDocument,
							mainImageDocument
						);

					return { artistExportModel, albumExportModels };
				}
			),
			switchMap(({ artistExportModel, albumExportModels }) => {
				const blob = new Blob(
					[
						JSON.stringify({
							artist: artistExportModel,
							albums: albumExportModels,
						}),
					],
					{
						type: 'text/json; charset=utf-8',
					}
				);

				saveAs(blob, `${artist.name}.bundle.json`);

				return of(true);
			})
		);
	}

	public createArtistExportFromFile(
		artistFile: File
	): Observable<ArtistExportModelWithAlbums> {
		const result = new ReplaySubject<ArtistExportModelWithAlbums>(1);
		const reader = new FileReader();

		reader.readAsText(artistFile);
		reader.onload = (event) => {
			const artistExportWithAlbums: ArtistExportModelWithAlbums =
				JSON.parse(event.target?.result?.toString() || '');

			result.next(artistExportWithAlbums);
		};

		return result;
	}

	public createDocumentExport(
		document: DocumentEntity | undefined
	): Observable<DocumentExportModel | null> {
		return this.getImageFromUrl(document?.filePath || '').pipe(
			switchMap((blob) => {
				const result = new ReplaySubject<ArrayBuffer>(1);
				const reader = new FileReader();

				reader.readAsArrayBuffer(blob);
				reader.onload = (event) => {
					result.next(event.target?.result as ArrayBuffer);
					result.complete();
				};

				return result;
			}),
			switchMap((arrayBuffer) => {
				return of(this.exportImportUtilService.encode(arrayBuffer));
			}),
			switchMap((fileAsText) => {
				return of(
					this.exportImportUtilService.createDocumentExportModel(
						document,
						fileAsText
					)
				);
			})
		);
	}

	public createDocumentFileImport(
		document: DocumentExportModel | null
	): Observable<string | undefined> {
		if (!document) {
			return of(undefined);
		}

		const documentFile: DocumentFile = {
			content: new Blob(
				[
					this.exportImportUtilService.decode(
						document?.base64EncodedFile || ''
					),
				],
				{
					type: 'image/jpeg',
				}
			),
			meta: { type: 'image' },
			path: this.exportImportUtilService.createFilePath(
				document?.originalName || '',
				'/document/'
			),
		};

		this.exportImportStateService.dispatchUploadImportFileAction(
			documentFile
		);

		return this.exportImportStateService
			.selectImportFilePath$(documentFile.path)
			.pipe(
				filter((data) => data !== undefined),
				first()
			);
	}

	public createDocumentImport(
		documentExportModel: DocumentExportModel | null,
		filePath: string | undefined
	): Observable<DocumentImportModel | null> {
		let documentImportModel: DocumentImportModel | null = null;

		if (documentExportModel && filePath) {
			documentImportModel = {
				entityType: documentExportModel.entityType,
				filePath,
				fileType: documentExportModel.fileType,
				name: documentExportModel.name,
				originalName: documentExportModel.originalName,
				uid: documentExportModel.uid,
			};

			if (documentExportModel.meta) {
				documentImportModel.meta = documentExportModel.meta;
			}
		}

		return of(documentImportModel);
	}

	public exportArtistBundle(artist: ArtistEntity): void {
		throw new Error('Method not implemented.');
	}

	public exportEntity(entity: Entity, name: string): void {
		throw new Error('Method not implemented.');
	}

	public importArtistBundle(artistFile: File): Observable<boolean> {
		return this.createArtistExportFromFile(artistFile).pipe(
			switchMap((artistExportModelWithAlbums) =>
				combineLatest([
					this.getDocumentExportModels(
						artistExportModelWithAlbums.artist
					).pipe(
						switchMap((documentExportModels) =>
							this.createDocumentFiles(documentExportModels)
						),
						map((documentImportModels) => {
							return {
								artistExportModel:
									artistExportModelWithAlbums.artist,
								documentImportModels,
							};
						})
					),
					this.importAlbumEntities(
						artistExportModelWithAlbums.albums
					),
				])
			),
			map(
				([
					{ artistExportModel, documentImportModels },
					albumExportModels,
				]) => {
					const artistImportModel: ArtistImportModel =
						this.createArtistEntity(
							artistExportModel,
							documentImportModels
						);

					this.exportImportStateService.dispatchUpdateArtistAction(
						artistImportModel
					);

					return true;
				}
			)
		);
	}

	private createAlbumExport(
		album: AlbumEntity
	): Observable<AlbumExportModel> {
		const coverImageId = album.coverImage?.uid || '';

		this.exportImportStateService.dispatchLoadDocumentAction(coverImageId);

		return this.exportImportStateService
			.selectDocumentById$(coverImageId)
			.pipe(
				filter(
					(coverImageDocument) => coverImageDocument !== undefined
				),
				switchMap((coverImageDocument) => {
					return this.createDocumentExport(
						coverImageDocument as DocumentEntity
					);
				}),
				first(),
				switchMap((coverImageDocument) => {
					const albumExportModel: AlbumExportModel =
						this.exportImportUtilService.createAlbumExportModel(
							album,
							coverImageDocument
						);

					return of(albumExportModel);
				})
			);
	}

	private createAlbumExports(
		albums: AlbumEntity[]
	): Observable<AlbumExportModel[]> {
		return from(albums).pipe(
			mergeMap((album) => {
				return this.createAlbumExport(album);
			}),
			reduce((acc: AlbumExportModel[], value) => {
				return [...acc, value];
			}, [])
		);
	}

	private createArtistEntity(
		artistExportModel: ArtistExportModel,
		documentImportModels: (DocumentImportModel | null)[]
	) {
		const artistImportModel: ArtistImportModel = {
			country: artistExportModel.country,
			description: artistExportModel.description,
			entityType: artistExportModel.entityType,
			formedIn: new Date(artistExportModel.formedIn),
			genre: artistExportModel.genre,
			name: artistExportModel.name,
			sites: artistExportModel.sites,
			styles: artistExportModel.styles,
			uid: artistExportModel.uid,
		};

		if (artistExportModel.members) {
			artistImportModel.members = artistExportModel.members;
		}

		if (artistExportModel.meta) {
			artistImportModel.meta = artistExportModel.meta;
		}

		const headerImageDocument: DocumentEntity | null =
			documentImportModels[0];
		const mainImageDocument: DocumentEntity | null =
			documentImportModels[1];

		if (headerImageDocument) {
			artistImportModel.headerImage = headerImageDocument;

			this.exportImportStateService.dispatchUpdateDocumentAction(
				headerImageDocument
			);
		}

		if (mainImageDocument) {
			artistImportModel.mainImage = mainImageDocument;

			this.exportImportStateService.dispatchUpdateDocumentAction(
				mainImageDocument
			);
		}

		return artistImportModel;
	}

	private createDocumentFiles(
		documentExportModels: (DocumentExportModel | null)[]
	): Observable<(DocumentImportModel | null)[]> {
		const calls = documentExportModels.map((documentExportModel) =>
			this.createDocumentFileImport(documentExportModel).pipe(
				switchMap((filePath) =>
					this.createDocumentImport(documentExportModels[0], filePath)
				)
			)
		);

		return forkJoin(calls);
	}

	private getDocumentExportModels(
		artistExportModel: ArtistExportModel
	): Observable<(DocumentExportModel | null)[]> {
		return of([
			artistExportModel.headerImageDocument,
			artistExportModel.mainImageDocument,
		]);
	}

	private getImageFromUrl(imageUrl: string): Observable<Blob> {
		return from(fetch(imageUrl)).pipe(
			switchMap((response) => from(response.blob()))
		);
	}

	private importAlbumEntities(
		albumExportModels: AlbumExportModel[]
	): Observable<AlbumEntity[]> {
		const calls = albumExportModels.map((albumExportModel) =>
			this.createDocumentFileImport(albumExportModel.coverImageDocument)
				.pipe(
					switchMap((filePath) =>
						this.createDocumentImport(
							albumExportModel.coverImageDocument,
							filePath
						)
					)
				)
				.pipe(
					switchMap((documentImportModel) =>
						this.importAlbumEntity(
							albumExportModel,
							documentImportModel
						)
					)
				)
		);

		return forkJoin(calls);
	}

	private importAlbumEntity(
		albumExportModel: AlbumExportModel,
		documentImportModel: DocumentImportModel | null
	): Observable<AlbumEntity> {
		const albumEntity: AlbumEntity =
			this.exportImportUtilService.createAlbumEntity(
				albumExportModel,
				documentImportModel
			);

		return of(albumEntity).pipe(
			tap((albumEntity) =>
				this.exportImportStateService.dispatchUpdateAlbumAction(
					albumEntity
				)
			)
		);
	}
}
