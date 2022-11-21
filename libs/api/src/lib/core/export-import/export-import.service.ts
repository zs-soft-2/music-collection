import { Observable } from 'rxjs';

import { BaseService, Entity } from '../../common';
import { ArtistEntity } from '../../domain';
import { ArtistExportModelWithAlbums } from './export-import';

export abstract class ExportImportService extends BaseService {
	public abstract createArtistExport(
		artist: ArtistEntity
	): Observable<boolean>;
	public abstract createArtistExportFromFile(
		artistFile: File
	): Observable<ArtistExportModelWithAlbums>;
	public abstract exportArtistBundle(artist: ArtistEntity): void;
	public abstract exportEntity(entity: Entity, name: string): void;
	public abstract importArtistBundle(artistFile: File): Observable<boolean>;
}
