import { Observable } from 'rxjs';

import { BaseService } from '../../common';
import {
	AlbumEntity,
	ArtistEntity,
	DocumentEntity,
	DocumentFile,
} from '../../domain';

export abstract class ExportImportStateService extends BaseService {
	public abstract dispatchListAlbumsByIdAction(uid: string): void;
	public abstract dispatchLoadDocumentAction(uid: string): void;
	public abstract dispatchUpdateArtistAction(artist: ArtistEntity): void;
	public abstract dispatchUpdateDocumentAction(
		document: DocumentEntity
	): void;
	public abstract dispatchUploadImportFileAction(file: DocumentFile): void;
	public abstract selectAlbums$(): Observable<AlbumEntity[] | null>;
	public abstract selectDocumentById$(
		uid: string
	): Observable<DocumentEntity | undefined>;
	public abstract selectImportFilePath$(
		name: string
	): Observable<string | undefined>;
}
