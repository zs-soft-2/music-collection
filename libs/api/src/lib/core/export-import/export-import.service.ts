import { Observable } from 'rxjs';

import { BaseService, Entity } from '../../common';
import { ArtistEntity } from '../../domain';
import { ArtistExportModel } from './export-import';

export abstract class ExportImportService extends BaseService {
	public abstract createArtistExport(
		artist: ArtistEntity
	): Observable<ArtistExportModel>;
	public abstract createArtistExportFromFile(
		artistFile: File
	): Observable<ArtistExportModel>;
	public abstract exportArtistBundle(artist: ArtistEntity): void;
	public abstract exportEntity(entity: Entity, name: string): void;
	public abstract importArtistBundle(artistFile: File): Observable<boolean>;
}
