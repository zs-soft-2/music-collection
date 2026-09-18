import { EntityUtilService } from '../../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
} from '../../../core';
import {
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate,
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate,
} from './musician';

export abstract class MusicianUtilService extends EntityUtilService<
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate
> {
	public abstract convertEntityAddToModelAdd(
		entity: MusicianEntityAdd
	): MusicianModelAdd;
	public abstract convertEntityToModel(entity: MusicianEntity): MusicianModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: MusicianEntityUpdate
	): MusicianModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: MusicianModelAdd
	): MusicianEntityAdd;
	public abstract convertModelToEntity(model: MusicianModel): MusicianEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: MusicianModelUpdate
	): MusicianEntityUpdate;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate;
}
