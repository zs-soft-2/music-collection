import { Injectable } from '@angular/core';
import {
	ActionEnum,
	LabelPermissionsService,
	LabelResourceEnum,
} from '@music-collection/api';

@Injectable()
export class LabelAdminPermissionsService extends LabelPermissionsService {
	public static readonly viewLabelAdminPage =
		ActionEnum.VIEW.toString() +
		LabelResourceEnum.LABEL_ADMIN_PAGE.toString();
	public static readonly viewLabelEditPage =
		ActionEnum.VIEW.toString() +
		LabelResourceEnum.LABEL_EDIT_PAGE.toString();
	public static readonly viewLabelListPage =
		ActionEnum.VIEW.toString() +
		LabelResourceEnum.LABEL_LIST_PAGE.toString();
}
