import { Injectable } from '@angular/core';
import {
	ActionEnum,
	ReleasePermissionsService,
	ReleaseResourceEnum,
} from '@music-collection/api';

@Injectable()
export class ReleaseAdminPermissionsService extends ReleasePermissionsService {
	public static readonly viewReleaseAdminPage =
		ActionEnum.VIEW.toString() +
		ReleaseResourceEnum.RELEASE_ADMIN_PAGE.toString();
	public static readonly viewReleaseEditPage =
		ActionEnum.VIEW.toString() +
		ReleaseResourceEnum.RELEASE_EDIT_PAGE.toString();
	public static readonly viewReleaseListPage =
		ActionEnum.VIEW.toString() +
		ReleaseResourceEnum.RELEASE_LIST_PAGE.toString();
}
