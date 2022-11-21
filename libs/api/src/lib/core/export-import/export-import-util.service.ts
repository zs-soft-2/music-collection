import { BaseService } from '../../common';
import { AlbumEntity, ArtistEntity, DocumentEntity } from '../../domain';
import {
	AlbumExportModel,
	ArtistExportModel,
	DocumentExportModel,
	DocumentImportModel,
} from './export-import';

export abstract class ExportImportUtilService extends BaseService {
	public abstract createAlbumEntity(
		albumExportModel: AlbumExportModel,
		documentImportModel: DocumentImportModel | null
	): AlbumEntity;
	public abstract createAlbumExportModel(
		albumEntity: AlbumEntity,
		coverImageDocument: DocumentExportModel | null
	): AlbumExportModel;
	public abstract createArtistExportModel(
		artistEntity: ArtistEntity,
		headerImageDocument: DocumentExportModel | null,
		mainImageDocument: DocumentExportModel | null
	): ArtistExportModel;
	public abstract createDocumentExportModel(
		documentEntity: DocumentEntity | undefined,
		fileAsText: string
	): DocumentExportModel | null;
	public abstract createFilePath(data: string, folder: string): string;
	public abstract decode(fileAsText: string): ArrayBuffer;
	public abstract encode(arrayBuffer: ArrayBuffer): string;
}
