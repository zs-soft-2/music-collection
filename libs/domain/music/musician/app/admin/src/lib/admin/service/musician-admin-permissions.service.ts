import { Injectable } from '@angular/core';
import {
	ActionEnum,
	MusicianPermissionsService,
	MusicianResourceEnum,
} from '@music-collection/api';

@Injectable()
export class MusicianAdminPermissionsService extends MusicianPermissionsService {
	public static readonly viewMusicianAdminPage =
		ActionEnum.VIEW.toString() +
		MusicianResourceEnum.MUSICIAN_ADMIN_PAGE.toString();
	public static readonly viewMusicianEditPage =
		ActionEnum.VIEW.toString() +
		MusicianResourceEnum.MUSICIAN_EDIT_PAGE.toString();
	public static readonly viewMusicianListPage =
		ActionEnum.VIEW.toString() +
		MusicianResourceEnum.MUSICIAN_LIST_PAGE.toString();
}
