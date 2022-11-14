import { decode, encode } from 'base64-arraybuffer';
import { saveAs } from 'file-saver';
import {
	combineLatest,
	filter,
	first,
	forkJoin,
	from,
	map,
	Observable,
	of,
	ReplaySubject,
	switchMap,
	tap,
} from 'rxjs';

import { Injectable } from '@angular/core';
import {
	ArtistEntity,
	ArtistExportModel,
	ArtistImportModel,
	ArtistStateService,
	DocumentEntity,
	DocumentExportModel,
	DocumentFile,
	DocumentImportModel,
	DocumentStateService,
	DocumentUtilService,
	Entity,
	ExportImportService,
} from '@music-collection/api';

@Injectable()
export class ExportImportServiceImpl extends ExportImportService {
	public constructor(
		private artistStateService: ArtistStateService,
		private documentStateService: DocumentStateService,
		private documentUtilService: DocumentUtilService
	) {
		super();
	}

	public createArtistExport(
		artist: ArtistEntity
	): Observable<ArtistExportModel> {
		return combineLatest([
			this.createDocumentExport(artist.headerImage),
			this.createDocumentExport(artist.mainImage),
		]).pipe(
			switchMap(([headerImageDocument, mainImageDocument]) => {
				const {
					description,
					entityType,
					genre,
					formedIn,
					name,
					sites,
					styles,
					uid,
					members,
					meta,
				} = artist;

				const artistExportModel: ArtistExportModel = {
					description,
					entityType,
					genre,
					formedIn: formedIn.toISOString(),
					name,
					sites,
					styles,
					uid,
					members,
					meta,
					headerImageDocument,
					mainImageDocument,
				};

				return of(artistExportModel);
			}),
			tap((artistExport) => {
				const blob = new Blob([JSON.stringify(artistExport)], {
					type: 'text/json; charset=utf-8',
				});

				saveAs(blob, `${artist.name}.bundle.json`);
			})
		);
	}

	public createArtistExportFromFile(
		artistFile: File
	): Observable<ArtistExportModel> {
		const result = new ReplaySubject<ArtistExportModel>(1);
		const reader = new FileReader();

		reader.readAsText(artistFile);
		reader.onload = (event) => {
			const artistExport: ArtistExportModel = JSON.parse(
				event.target?.result?.toString() || ''
			);

			result.next(artistExport);
		};

		return result;
	}

	public createDocumentExport(
		document: DocumentEntity | undefined
	): Observable<DocumentExportModel | null> {
		return this.getImageFromUrl(document?.filePath || '').pipe(
			switchMap((blob) => {
				const result = new ReplaySubject<string>(1);
				const reader = new FileReader();

				reader.readAsArrayBuffer(blob);
				reader.onload = (event) =>
					result.next(encode(event.target?.result as ArrayBuffer));

				return result;
			}),
			switchMap((fileAsText) => {
				let documentExportModel: DocumentExportModel | null = null;

				if (document) {
					const {
						entityType,
						filePath,
						fileType,
						name,
						originalName,
						uid,
					} = document;

					documentExportModel = {
						entityType,
						filePath,
						fileType,
						name,
						originalName,
						uid,
						base64EncodedFile: fileAsText,
					};
				}

				return of(documentExportModel);
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
			content: new Blob([decode(document?.base64EncodedFile || '')], {
				type: 'image/jpeg',
			}),
			meta: { type: 'image' },
			path: this.documentUtilService.createFilePath(
				document?.originalName || '',
				'/document/'
			),
		};

		this.documentStateService.dispatchUploadImportFileAction(documentFile);

		return this.documentStateService
			.selectImportFilePath$(documentFile.path)
			.pipe(
				filter((data) => data !== undefined),
				first()
			);
	}

	public createDocumentImport(
		documentExportModel: DocumentExportModel | null, filePath: string | undefined
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
		const bundle = {
			artist: this.createArtistExport(artist),
		};

		const blob = new Blob([JSON.stringify(bundle)], {
			type: 'text/json; charset=utf-8',
		});

		saveAs(blob, `${artist.name}.bundle.json`);
	}

	public exportDocument(document: DocumentEntity, name: string): void {
		const blob = new Blob([JSON.stringify(document)], {
			type: 'text/json; charset=utf-8',
		});

		saveAs(blob, name);
	}

	public exportEntity(entity: Entity, name: string): void {
		const blob = new Blob([JSON.stringify(entity)], {
			type: 'text/json; charset=utf-8',
		});

		saveAs(blob, name);
	}

	public exportImage(url: string, fileName: string, fileType: string): void {
		saveAs(url, `${fileName}.${fileType}`);
	}

	public importArtistBundle(artistFile: File): Observable<boolean> {
		return this.createArtistExportFromFile(artistFile).pipe(
			switchMap((artistExportModel) =>
				this.getDocumentExportModels(artistExportModel).pipe(
					switchMap((documentExportModels) =>
						this.createDocumentFiles(documentExportModels)
					),
					map((documentImportModels) => {
						return {
							artistExportModel,
							documentImportModels,
						};
					})
				)
			),
			map(({ artistExportModel, documentImportModels }) => {
				const artistImportModel: ArtistImportModel = {
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

					this.documentStateService.dispatchUpdateEntityAction(
						headerImageDocument
					);
				}

				if (mainImageDocument) {
					artistImportModel.mainImage = mainImageDocument;

					this.documentStateService.dispatchUpdateEntityAction(
						mainImageDocument
					);
				}

				this.artistStateService.dispatchUpdateEntityAction(
					artistImportModel
				);

				return true;
			})
		);
	}

	private createDocumentFiles(
		documentExportModels: (DocumentExportModel | null)[]
	): Observable<(DocumentImportModel | null)[]> {
		const calls = [
			this.createDocumentFileImport(documentExportModels[0]).pipe(
				switchMap((filePath) =>
					this.createDocumentImport(documentExportModels[0], filePath)
				)
			),
			this.createDocumentFileImport(documentExportModels[1]).pipe(
				switchMap((filePath) =>
					this.createDocumentImport(documentExportModels[1], filePath)
				)
			),
		];

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
}
