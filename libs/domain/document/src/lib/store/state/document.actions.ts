import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentFile,
	SearchParams,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addDocument = createAction(
	'[Document] Add Document',
	props<{ document: DocumentEntityAdd }>()
);

export const addDocumentFail = createAction(
	'[Document] Add Document Fail',
	props<{ error: Error }>()
);

export const addDocumentSuccess = createAction(
	'[Document] Add Document Success',
	props<{ document: DocumentEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[Document Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearDocuments = createAction('[Document] Clear Documents');

export const clearFilePath = createAction('[Document] Clear File Path');

export const deleteDocument = createAction(
	'[Document] Delete Document',
	props<{ document: DocumentEntity }>()
);

export const deleteDocumentFail = createAction(
	'[Document] Delete Document Fail',
	props<{ error: Error }>()
);

export const deleteDocumentSuccess = createAction(
	'[Document] Delete Document Success',
	props<{ documentId: string }>()
);

export const listDocuments = createAction('[Document] List Documents');

export const listDocumentsFail = createAction(
	'[Document] List Documents FAIL',
	props<{ error: Error }>()
);

export const listDocumentsSuccess = createAction(
	'[Document] List Documents Success',
	props<{ documents: DocumentEntity[] }>()
);

export const listDocumentsByCategoryId = createAction(
	'[Documents] List Documents By Category Id',
	props<{ categoryId: string }>()
);

export const listDocumentsByCategoryIdSuccess = createAction(
	'[Documents] List Documents By Category Id Success',
	props<{ documents: DocumentEntity[] }>()
);

export const loadDocument = createAction(
	'[Document] Load Document',
	props<{ uid: string }>()
);

export const loadDocumentFail = createAction(
	'[Document] Load Document FAIL',
	props<{ error: Error }>()
);

export const loadDocumentSuccess = createAction(
	'[Document] Load Document Success',
	props<{ document: DocumentEntity | undefined }>()
);

export const search = createAction(
	'[Document] Search Documents',
	props<{ params: SearchParams }>()
);
export const searchFailed = createAction(
	'[Document] Search Documents Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[Document] Search Documents Success',
	props<{ result: DocumentEntity[] }>()
);

export const selectDocument = createAction(
	'[Document] Select Document',
	props<{ documentId: string }>()
);

export const setSelectedDocumentId = createAction(
	'[Document Admin] Set Selected Document Id',
	props<{ documentId: string }>()
);

export const updateDocument = createAction(
	'[Document] Update Document',
	props<{ document: DocumentEntityUpdate }>()
);

export const updateDocumentFail = createAction(
	'[Document] Update Document Fail',
	props<{ error: Error }>()
);

export const updateDocumentSuccess = createAction(
	'[Document] Update Document Success',
	props<{ document: Update<DocumentEntityUpdate> }>()
);

export const uploadFile = createAction(
	'[Document] Upload File',
	props<{ file: DocumentFile }>()
);

export const uploadFileFail = createAction(
	'[Document] Upload File Fail',
	props<{ error: Error }>()
);

export const uploadFileSuccess = createAction(
	'[Document] Upload File Success',
	props<{ filePath: string }>()
);
