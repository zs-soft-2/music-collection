import { Injectable } from '@angular/core';
import {
	ActionEnum,
	AlbumPermissionsService,
	AlbumResourceEnum,
} from '@music-collection/api';

@Injectable()
export class AlbumAdminPermissionsService extends AlbumPermissionsService {
	public static readonly viewAlbumAdminPage =
		ActionEnum.VIEW.toString() +
		AlbumResourceEnum.ALBUM_ADMIN_PAGE.toString();
	public static readonly viewAlbumEditPage =
		ActionEnum.VIEW.toString() +
		AlbumResourceEnum.ALBUM_EDIT_PAGE.toString();
	public static readonly viewAlbumListPage =
		ActionEnum.VIEW.toString() +
		AlbumResourceEnum.ALBUM_LIST_PAGE.toString();
}
