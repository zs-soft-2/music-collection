import { DOCUMENT_FEATURE_KEY, DocumentEntity } from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as documentActions from './document.actions';

export interface State extends EntityState<DocumentEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	searchResult: DocumentEntity[];
	filePath: string | undefined;
	error?: string | null;
}

export interface DocumentPartialState {
	readonly [DOCUMENT_FEATURE_KEY]: State;
}

export function sort(a: DocumentEntity, b: DocumentEntity): number {
	return a.name < b.name ? 1 : -1;
}

export const documentAdapter: EntityAdapter<DocumentEntity> =
	createEntityAdapter<DocumentEntity>({
		selectId: (model: DocumentEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = documentAdapter.getInitialState({
	isNewEntityButtonEnabled: true,
	loading: false,
	error: null,
	searchResult: [],
	selectedDocumentId: null,
	filePath: undefined,
});

export const documentReducer = createReducer(
	initialState,
	on(documentActions.addDocumentSuccess, (state, { document }) =>
		documentAdapter.addOne(document as DocumentEntity, state)
	),
	on(documentActions.changeNewEntityButtonEnabled, (state, { enabled }) => ({
		...state,
		isNewEntityButtonEnabled: enabled,
	})),
	on(documentActions.selectDocument, (state, { documentId }) => ({
		...state,
		loading: false,
		error: null,
		selectedDocumentId: documentId,
	})),
	on(documentActions.updateDocumentSuccess, (state, { document }) =>
		documentAdapter.updateOne(document, state)
	),
	on(documentActions.deleteDocumentSuccess, (state, { documentId }) =>
		documentAdapter.removeOne(documentId, state)
	),
	on(documentActions.listDocumentsSuccess, (state, { documents }) =>
		documentAdapter.upsertMany(documents as DocumentEntity[], state)
	),
	on(documentActions.loadDocumentSuccess, (state, { document }) =>
		documentAdapter.upsertOne(document as DocumentEntity, state)
	),
	on(documentActions.clearDocuments, (state) =>
		documentAdapter.removeAll(state)
	),
	on(documentActions.clearFilePath, (state) => ({
		...state,
		filePath: undefined,
	})),
	on(documentActions.setSelectedDocumentId, (state, { documentId }) => ({
		...state,
		selectedId: documentId,
	})),
	on(documentActions.searchSuccess, (state, { result }) => ({
		...state,
		searchResult: result,
	})),
	on(documentActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	})),
	on(documentActions.uploadFileSuccess, (state, { filePath }) => ({
		...state,
		filePath,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return documentReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	documentAdapter.getSelectors();
