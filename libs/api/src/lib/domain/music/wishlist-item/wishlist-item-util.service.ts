import { EntityUtilService } from '../../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	UpdateEntityQuantityType,
} from '../../../core';
import {
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate,
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
} from './wishlist-item';

export abstract class WishlistItemUtilService extends EntityUtilService<
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: WishlistItemEntityAdd
	): WishlistItemModelAdd;
	public abstract convertEntityToModel(
		entity: WishlistItemEntity
	): WishlistItemModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: WishlistItemEntityUpdate
	): WishlistItemModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: WishlistItemModelAdd
	): WishlistItemEntityAdd;
	public abstract convertModelToEntity(
		model: WishlistItemModel
	): WishlistItemEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: WishlistItemModelUpdate
	): WishlistItemEntityUpdate;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity,
		wishlistItem: WishlistItemEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate;
}
