import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../common';
import {
	DocumentCategoryEnum,
	documentCategoryOf,
} from './document-category.enum';

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
 * Which documents the admin list shows. Every category is a tab of its own —
 * the value is the category's, so the two line up — and `Other` is what is
 * left: the uploads nobody has filed, so they carry no category.
 */
export enum DocumentFilterEnum {
	All = 'all',
	AlbumCover = 'album-cover',
	ArtistImage = 'artist-image',
	Scene = 'scene',
	Badge = 'badge',
	Other = 'other',
	Withdrawn = 'withdrawn',
}

/**
 * The category a tab stands for, or `undefined` for the tabs that are not a
 * category — the whole catalog, the unfiled uploads and the withdrawn ones.
 */
export const filterCategory = (
	filter: DocumentFilterEnum
): DocumentCategoryEnum | undefined => documentCategoryOf(filter);

export type DocumentTableParams = {
	documents: DocumentEntity[];
	empty: string[];
	/** Which set the list shows, so the tab can be marked as pressed. */
	filter: DocumentFilterEnum;
};
