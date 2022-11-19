import {
	AlbumEntity,
	ArtistEntity,
	ArtistEntityUpdate,
	DocumentEntity,
	DocumentFile,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const listAlbumsById = createAction(
	'[Export Import] List Albums By Id',
	props<{ uid: string }>()
);

export const listAlbumsByIdFail = createAction(
	'[Export Import] List Albums By Id FAIL',
	props<{ error: Error }>()
);

export const listAlbumsByIdSuccess = createAction(
	'[Export Import] List Albums By Id Success',
	props<{ albums: AlbumEntity[] }>()
);

export const loadDocument = createAction(
	'[Export Import] Load Document',
	props<{ uid: string }>()
);

export const loadDocumentFail = createAction(
	'[Export Import] Load Document FAIL',
	props<{ error: Error }>()
);

export const loadDocumentSuccess = createAction(
	'[Export Import] Load Document Success',
	props<{ document: DocumentEntity | undefined }>()
);

export const setArtist = createAction(
	'[Export Import] Set Artist',
	props<{ artist: ArtistEntity }>()
);

export const updateDocument = createAction(
	'[Export Import] Update Document',
	props<{ document: DocumentEntity }>()
);

export const updateDocumentFail = createAction(
	'[Export Import] Update Document Fail',
	props<{ error: Error }>()
);

export const updateDocumentSuccess = createAction(
	'[Export Import] Update Document Success',
	props<{ document: DocumentEntity }>()
);

export const uploadImportFile = createAction(
	'[Export Import] Upload Import File',
	props<{ file: DocumentFile }>()
);

export const uploadImportFileFail = createAction(
	'[Export Import] Upload Import File Fail',
	props<{ error: Error }>()
);

export const uploadImportFileSuccess = createAction(
	'[Export Import] Upload Import File Success',
	props<{ name: string; filePath: string }>()
);

export const updateArtist = createAction(
	'[Export Import] Update Artist',
	props<{ artist: ArtistEntity }>()
);

export const updateArtistFail = createAction(
	'[Export Import] Update Artist Fail',
	props<{ error: Error }>()
);

export const updateArtistSuccess = createAction(
	'[Export Import] Update Artist Success',
	props<{ artist: ArtistEntity }>()
);
