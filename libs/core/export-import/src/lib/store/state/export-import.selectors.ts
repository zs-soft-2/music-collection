import { AUTHENTICATION_FEATURE_KEY } from '@music-collection/api';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import {
	ExportImportPartialState,
	ExportImportState,
} from './export-import.reducer';

export const selectExportImportState = createFeatureSelector<
	ExportImportPartialState,
	ExportImportState
>('export-import');

export const selectAlbums = createSelector(
	selectExportImportState,
	(state: ExportImportState) => state.albums
);

export const selectDocumentById = (uid: string) =>
	createSelector(selectExportImportState, (state: ExportImportState) => {
		return state.documents?.find((document) => document.uid === uid);
	});

export const selectImportFilePath = (name: string) =>
	createSelector(selectExportImportState, (state: ExportImportState) =>
		state.importFilePath ? state.importFilePath[name] : undefined
	);
