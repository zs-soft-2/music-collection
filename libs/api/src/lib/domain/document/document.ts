import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../common';
import { DocumentCategoryEnum } from './document-category.enum';

export const DOCUMENT_FEATURE_KEY = 'document';

export interface DocumentFile {
	content: unknown;
	meta: { [key: string]: string };
	path: string;
}

export interface Document {
	/** What the file was made for; missing on the ones uploaded by hand. */
	category?: DocumentCategoryEnum;
	/**
	 * When the document was withdrawn, in epoch milliseconds (`null` once it
	 * is taken back). Neither the document nor its file is deleted: every
	 * reference made while it was live keeps resolving, and the admin can
	 * still find it. A withdrawn document is simply never offered again.
	 */
	deletedAt?: number | null;
	filePath: string;
	fileType: string;
	name: string;
	originalName: string;
}

/** Whether the document has been withdrawn — see `deletedAt`. */
export const isWithdrawnDocument = (
	document: Pick<Document, 'deletedAt'>
): boolean => !!document.deletedAt;

/** The documents still on offer: what a picker may show. */
export const liveDocuments = <T extends Pick<Document, 'deletedAt'>>(
	documents: T[]
): T[] => documents.filter((document) => !isWithdrawnDocument(document));

export type DocumentEntity = Document & Entity;

export type DocumentEntityAdd = Omit<DocumentEntity, 'uid'>;
export type DocumentEntityUpdate = Partial<DocumentEntity> & Entity;

export type DocumentModel = Document & Entity & Searchable;

export type DocumentModelAdd = Omit<DocumentModel, 'uid'>;

export type DocumentModelUpdate = Partial<DocumentModel> & Entity & Searchable;

export type DocumentFormParams = {
	formGroup: FormGroup;
};

/**
 * Which documents the admin list shows. `Other` is the plain uploads: the
 * ones no machine filed, so they carry no category.
 */
export enum DocumentFilterEnum {
	All = 'all',
	Badge = 'badge',
	Other = 'other',
	Withdrawn = 'withdrawn',
}

export type DocumentTableParams = {
	documents: DocumentEntity[];
	empty: string[];
	/** Which set the list shows, so the tab can be marked as pressed. */
	filter: DocumentFilterEnum;
};
