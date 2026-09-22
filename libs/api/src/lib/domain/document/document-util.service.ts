import { FormGroup } from '@angular/forms';

import { EntityUtilService } from '../../common';
import { EntityQuantityEntity, EntityQuantityEntityUpdate } from '../../core';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
} from './document';

export abstract class DocumentUtilService extends EntityUtilService<
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: DocumentEntityAdd
	): DocumentModelAdd;
	public abstract convertEntityToModel(entity: DocumentEntity): DocumentModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: DocumentEntityUpdate
	): DocumentModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: DocumentModelAdd
	): DocumentEntityAdd;
	public abstract convertModelToEntity(model: DocumentModel): DocumentEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: DocumentModelUpdate
	): DocumentEntityUpdate;
	public abstract createFilePath(data: string, folder?: string): string;
	/**
	 * The form of a document, from whatever of it is known. It carries what
	 * an admin never edits as well — the category it was filed under and its
	 * withdrawal mark — because saving writes the whole document, so what
	 * the form does not hold would be lost.
	 */
	public abstract createFormGroupByProperties(
		document: Partial<DocumentEntity>
	): FormGroup;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate;
}
