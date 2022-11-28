import { EntityUtilService } from '../../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
} from '../../../core';
import {
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate,
} from './label';

export abstract class LabelUtilService extends EntityUtilService<
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: LabelEntityAdd
	): LabelModelAdd;
	public abstract convertEntityToModel(entity: LabelEntity): LabelModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: LabelEntityUpdate
	): LabelModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: LabelModelAdd
	): LabelEntityAdd;
	public abstract convertModelToEntity(model: LabelModel): LabelEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: LabelModelUpdate
	): LabelEntityUpdate;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate;
}
