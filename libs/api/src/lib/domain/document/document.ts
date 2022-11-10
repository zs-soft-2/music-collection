import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../common';

export const DOCUMENT_FEATURE_KEY = 'document';

export interface DocumentFile {
	content: unknown;
	meta: { [key: string]: string };
	path: string;
}

export interface Document {
	filePath: string;
	fileType: string;
	name: string;
	originalName: string;
}

export type DocumentEntity = Document & Entity;

export type DocumentEntityAdd = Omit<DocumentEntity, 'uid'>;
export type DocumentEntityUpdate = Partial<DocumentEntity> & Entity;

export type DocumentModel = Document & Entity & Searchable;

export type DocumentModelAdd = Omit<DocumentModel, 'uid'>;

export type DocumentModelUpdate = Partial<DocumentModel> & Entity & Searchable;

export type DocumentFormParams = {
	formGroup: FormGroup;
};

export type DocumentTableParams = {
	documents: DocumentEntity[];
	empty: string[];
};
