import { Entity } from '../../common';
import { Album, Artist, Document } from '../../domain';

export interface ArtistExport extends Artist {
	formedIn: string;
	headerImageDocument: DocumentExportModel | null;
	mainImageDocument: DocumentExportModel | null;
}

export interface AlbumExport extends Omit<Album, 'coverImage'> {
	year: string;
	coverImageDocument: DocumentExportModel | null;
}

export interface AlbumImport extends Album {
	year: Date;
}

export interface ArtistImport extends Artist {
	formedIn: Date;
}

export interface DocumentExport extends Document {
	base64EncodedFile: string;
}

export type DocumentExportModel = DocumentExport & Entity;
export type DocumentImportModel = Document & Entity;

export type ArtistExportModel = ArtistExport & Entity;
export type ArtistImportModel = ArtistImport & Entity;

export type AlbumExportModel = AlbumExport & Entity;

export type ArtistExportModelWithAlbums = {
	artist: ArtistExportModel;
	albums: AlbumExportModel[];
};
