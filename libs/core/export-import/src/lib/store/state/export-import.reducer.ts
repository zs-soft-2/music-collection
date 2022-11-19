import {
	AlbumEntity,
	ArtistEntity,
	DocumentEntity,
	ImportFilePath,
} from '@music-collection/api';
import { Action, createReducer, on } from '@ngrx/store';

import * as exportImportActions from './export-import.actions';

export interface ExportImportState {
	artist: ArtistEntity | null;
	albums: AlbumEntity[] | null;
	documents: DocumentEntity[] | null;
	importFilePath: ImportFilePath | null;
}

export interface ExportImportPartialState {
	readonly ['export-import']: ExportImportState;
}

export const exportImportReducer = createReducer<ExportImportState, Action>(
	{ artist: null, albums: null, documents: null, importFilePath: null },
	on(exportImportActions.listAlbumsByIdSuccess, (state, { albums }) => ({
		...state,
		albums,
	})),
	on(
		exportImportActions.setArtist,
		exportImportActions.updateArtistSuccess,
		(state, { artist }) => ({
			...state,
			artist,
			albums: null,
			documents: null,
			importFilePath: null,
		})
	),
	on(
		exportImportActions.loadDocumentSuccess,
		exportImportActions.updateDocumentSuccess,
		(state, { document }) => {
			const documents = [...(state.documents || [])];

			if (document) {
				documents.push(document);
			}

			return {
				...state,
				documents,
			};
		}
	),
	on(
		exportImportActions.uploadImportFileSuccess,
		(state, { name, filePath }) => {
			const importFilePath = { ...state.importFilePath };

			importFilePath[name] = filePath;

			return {
				...state,
				importFilePath,
			};
		}
	)
);
