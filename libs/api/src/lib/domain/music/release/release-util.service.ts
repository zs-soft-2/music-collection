import { FormGroup } from '@angular/forms';

import { EntityUtilService } from '../../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	UpdateEntityQuantityType,
} from '../../../core';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
} from './release';

export abstract class ReleaseUtilService extends EntityUtilService<
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: ReleaseEntityAdd
	): ReleaseModelAdd;
	public abstract convertEntityToModel(entity: ReleaseEntity): ReleaseModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: ReleaseEntityUpdate
	): ReleaseModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: ReleaseModelAdd
	): ReleaseEntityAdd;
	public abstract convertModelToEntity(model: ReleaseModel): ReleaseEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: ReleaseModelUpdate
	): ReleaseEntityUpdate;
	public abstract createOrUpdateFormGroupForDisabling(
		formGroup: FormGroup,
		release: ReleaseEntity | undefined,
		isAlbumsActive: boolean,
		isArtistsActive: boolean
	): FormGroup;
	public abstract updateEntityQuantity(
		entityQuantityEntity: EntityQuantityEntity,
		release: ReleaseEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate;
}
