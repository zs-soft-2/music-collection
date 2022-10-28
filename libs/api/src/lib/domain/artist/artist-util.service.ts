import { EntityUtilService } from '../../common';
import {
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
} from './artist';

export abstract class ArtistUtilService extends EntityUtilService<
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate
> {
	public abstract convertEntityToModel(entity: ArtistEntity): ArtistModel;

	public abstract convertEntityAddToModelAdd(
		entity: ArtistEntityAdd
	): ArtistModelAdd;

	public abstract convertEntityUpdateToModelUpdate(
		entity: ArtistEntityUpdate
	): ArtistModelUpdate;

	public abstract convertModelToEntity(model: ArtistModel): ArtistEntity;

	public abstract convertModelAddToEntityAdd(
		model: ArtistModelAdd
	): ArtistEntityAdd;

	public abstract convertModelUpdateToEntityUpdate(
		model: ArtistModelUpdate
	): ArtistEntityUpdate;
}
