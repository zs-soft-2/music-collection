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
	public abstract createFormGroupByProperties(
		name: string | undefined,
		filePath: string | undefined,
		fileType: string | undefined,
		originalName: string | undefined,
		uid: string | undefined
	): FormGroup;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate;
}
