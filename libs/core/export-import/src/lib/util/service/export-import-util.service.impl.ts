import { decode, encode } from 'base64-arraybuffer';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumExportModel,
	ArtistEntity,
	ArtistExportModel,
	DocumentEntity,
	DocumentExportModel,
	DocumentImportModel,
	DocumentUtilService,
	EntityTypeEnum,
	ExportImportUtilService,
} from '@music-collection/api';

@Injectable()
export class ExportImportUtilServiceImpl extends ExportImportUtilService {
	public constructor(private documentUtilService: DocumentUtilService) {
		super();
	}

	public createAlbumEntity(
		albumExportModel: AlbumExportModel,
		documentImportModel: DocumentImportModel | null
	): AlbumEntity {
		const albumEntity: AlbumEntity = {
			artist: albumExportModel.artist,
			coverImage: documentImportModel,
			format: albumExportModel.format,
			genre: albumExportModel.genre,
			entityType: albumExportModel.entityType,
			name: albumExportModel.name,
			songs: albumExportModel.songs,
			styles: albumExportModel.styles,
			uid: albumExportModel.uid,
			year: new Date(albumExportModel.year),
		};

		return albumEntity;
	}

	public createAlbumExportModel(
		albumEntity: AlbumEntity,
		coverImageDocument: DocumentExportModel
	): AlbumExportModel {
		const {
			artist,
			entityType,
			format,
			genre,
			name,
			songs,
			styles,
			uid,
			year,
			meta,
		} = albumEntity;

		const albumExportModel: AlbumExportModel = {
			artist: {
				...artist,
				entityType: artist.entityType || EntityTypeEnum.Artist,
			},
			entityType,
			format,
			genre,
			name,
			songs,
			styles,
			uid,
			year: year.toISOString(),
			meta,
			coverImageDocument,
		};

		return albumExportModel;
	}

	public createArtistExportModel(
		artistEntity: ArtistEntity,
		headerImageDocument: DocumentExportModel | null,
		mainImageDocument: DocumentExportModel | null
	): ArtistExportModel {
		const {
			country,
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
		} = artistEntity;

		const artistExportModel: ArtistExportModel = {
			country,
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

		return artistExportModel;
	}

	public createDocumentExportModel(
		documentEntity: DocumentEntity | undefined,
		fileAsText: string
	): DocumentExportModel | null {
		let documentExportModel: DocumentExportModel | null = null;

		if (documentEntity) {
			const { entityType, filePath, fileType, name, originalName, uid } =
				documentEntity;

			documentExportModel = {
				entityType: entityType || EntityTypeEnum.Document,
				filePath,
				fileType,
				name,
				originalName,
				uid,
				base64EncodedFile: fileAsText,
			};
		}

		return documentExportModel;
	}

	public createFilePath(data: string, folder: string = '/'): string {
		return this.documentUtilService.createFilePath(data, folder);
	}

	public decode(fileAsText: string): ArrayBuffer {
		return decode(fileAsText);
	}

	public encode(arrayBuffer: ArrayBuffer): string {
		return encode(arrayBuffer);
	}
}
