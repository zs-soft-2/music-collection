import { EntityUtilService } from '../../../common';
import { AlbumEntityAdd } from '../album';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
} from '../../../core';
import {
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
} from './artist';
import { ArtistExternalAlbum } from './artist-external';

export abstract class ArtistUtilService extends EntityUtilService<
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate
> {
	/** A new album of the artist from an album found online. */
	public abstract createAlbumFromExternal(
		artist: ArtistEntity,
		album: ArtistExternalAlbum
	): AlbumEntityAdd;
	public abstract convertEntityAddToModelAdd(
		entity: ArtistEntityAdd
	): ArtistModelAdd;
	public abstract convertEntityToModel(entity: ArtistEntity): ArtistModel;
	public abstract convertEntityUpdateToModelUpdate(
		entity: ArtistEntityUpdate
	): ArtistModelUpdate;
	public abstract convertModelAddToEntityAdd(
		model: ArtistModelAdd
	): ArtistEntityAdd;
	public abstract convertModelToEntity(model: ArtistModel): ArtistEntity;
	public abstract convertModelUpdateToEntityUpdate(
		model: ArtistModelUpdate
	): ArtistEntityUpdate;
	public abstract updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate;
}
