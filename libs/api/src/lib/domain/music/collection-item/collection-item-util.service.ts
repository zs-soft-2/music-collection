import { FormGroup } from '@angular/forms';

import {
	EntityTypeEnum,
	EntityUtilService,
	SearchParams,
} from '../../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	UpdateEntityQuantityType,
	User,
} from '../../../core';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	CollectionSortByEnum,
} from './collection-item';

export abstract class CollectionItemUtilService extends EntityUtilService<
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: CollectionItemEntityAdd
	): CollectionItemModelAdd;
	public abstract convertEntityToModel(
		entity: CollectionItemEntity
	): CollectionItemModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: CollectionItemEntityUpdate
	): CollectionItemModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: CollectionItemModelAdd
	): CollectionItemEntityAdd;
	public abstract convertModelToEntity(
		model: CollectionItemModel
	): CollectionItemEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: CollectionItemModelUpdate
	): CollectionItemEntityUpdate;
	/** Looks the term up among the artists of the collected releases. */
	public abstract createSearchParamsByArtist(
		entityType: EntityTypeEnum,
		term: string
	): SearchParams;
	public abstract createFormGroupByUser(
		entity: CollectionItemEntity | undefined,
		user: User
	): FormGroup;
	public abstract filterByArtist(
		collectionItems: CollectionItemEntity[],
		filterByArtistNames: string[] | null
	): CollectionItemEntity[];
	public abstract sortCollectionItems(
		sortBy: CollectionSortByEnum | null,
		collectionItems: CollectionItemEntity[]
	): CollectionItemEntity[];
	public abstract updateEntityQuantity(
		entityQuantityEntity: EntityQuantityEntity,
		collectionItem: CollectionItemEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate;
}
