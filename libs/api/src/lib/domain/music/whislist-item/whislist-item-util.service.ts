import { EntityUtilService } from '../../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
} from '../../../core';
import {
	WhislistItemEntity,
	WhislistItemEntityAdd,
	WhislistItemEntityUpdate,
	WhislistItemModel,
	WhislistItemModelAdd,
	WhislistItemModelUpdate,
} from './whislist-item';

export abstract class WhislistItemUtilService extends EntityUtilService<
	WhislistItemEntity,
	WhislistItemEntityAdd,
	WhislistItemEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: WhislistItemEntityAdd
	): WhislistItemModelAdd;
	public abstract convertEntityToModel(
		entity: WhislistItemEntity
	): WhislistItemModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: WhislistItemEntityUpdate
	): WhislistItemModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: WhislistItemModelAdd
	): WhislistItemEntityAdd;
	public abstract convertModelToEntity(
		model: WhislistItemModel
	): WhislistItemEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: WhislistItemModelUpdate
	): WhislistItemEntityUpdate;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate;
}
