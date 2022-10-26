import { ActionEnum } from '../../core';
import { AlbumResourceEnum } from './album-resource.enum';

export class AlbumPermissionsService {
	static readonly createAlbumEntity =
		ActionEnum.CREATE.toString() +
		AlbumResourceEnum.ALBUM_ENTITY.toString();
	static readonly deleteAlbumEntity =
		ActionEnum.DELETE.toString() +
		AlbumResourceEnum.ALBUM_ENTITY.toString();
	static readonly updateAlbumEntity =
		ActionEnum.UPDATE.toString() +
		AlbumResourceEnum.ALBUM_ENTITY.toString();
	static readonly viewAlbumEntity =
		ActionEnum.VIEW.toString() + AlbumResourceEnum.ALBUM_ENTITY.toString();
}
