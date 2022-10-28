import { DOCUMENT_FEATURE_KEY, DocumentEntity } from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import {
	documentAdapter,
	DocumentPartialState,
	State,
} from './document.reducer';

const { selectAll, selectEntities } = documentAdapter.getSelectors();

export const getDocumentState = createFeatureSelector<
	DocumentPartialState,
	State
>(DOCUMENT_FEATURE_KEY);

export const getDocumentError = createSelector(
	getDocumentState,
	(state: State) => state.error
);

export const getDocumentLoading = createSelector(
	getDocumentState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getDocumentState,
	(state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
	getDocumentState,
	(state: State) => state.isNewEntityButtonEnabled
);

export const selectDocumentEntities = createSelector(
	getDocumentState,
	selectEntities
);

export const selectAllDocument = createSelector(getDocumentState, selectAll);

export const selectDocument = createSelector(
	selectDocumentEntities,
	getSelectedId,
	(documentEntities, documentID) => documentEntities[documentID]
);

export const selectDocumentById = () =>
	createSelector(
		selectDocumentEntities,
		(documentEntities: Dictionary<DocumentEntity>, props: any) => {
			const documentEntity = documentEntities[props.uid];

			return documentEntity;
		}
	);

export const selectSearchResult = createSelector(
	getDocumentState,
	(state: State) => state.searchResult
);

export const selectFilePath = createSelector(
	getDocumentState,
	(state: State) => {
		return state.filePath;
	}
);
