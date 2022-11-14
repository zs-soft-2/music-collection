import { Entity } from '../../common';
import { Artist, Document } from '../../domain';

export interface ArtistExport extends Artist {
	formedIn: string;
	headerImageDocument: DocumentExportModel | null;
	mainImageDocument: DocumentExportModel | null;
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
