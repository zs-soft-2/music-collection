import { EntityUtilService } from '../../common';
import { EntityQuantityEntity, EntityQuantityEntityUpdate } from '../../core';
import {
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate,
} from './album';

export abstract class AlbumUtilService extends EntityUtilService<
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate
> {
	public abstract _sortByYear(a: AlbumEntity, b: AlbumEntity): number;
	public abstract convertEntityAddToModelAdd(
		entity: AlbumEntityAdd
	): AlbumModelAdd;
	public abstract convertEntityToModel(entity: AlbumEntity): AlbumModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: AlbumEntityUpdate
	): AlbumModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: AlbumModelAdd
	): AlbumEntityAdd;
	public abstract convertModelToEntity(model: AlbumModel): AlbumEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: AlbumModelUpdate
	): AlbumEntityUpdate;
	public abstract updateEntityQuantity(
		entityQuantityEntity: EntityQuantityEntity,
		album: AlbumEntity
	): EntityQuantityEntityUpdate;
}
