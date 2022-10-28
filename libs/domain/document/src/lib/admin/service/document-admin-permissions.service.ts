import { Injectable } from '@angular/core';
import {
	ActionEnum,
	DocumentPermissionsService,
	DocumentResourceEnum,
} from '@music-collection/api';

@Injectable()
export class DocumentAdminPermissionsService extends DocumentPermissionsService {
	public static readonly viewDocumentAdminPage =
		ActionEnum.VIEW.toString() +
		DocumentResourceEnum.DOCUMENT_ADMIN_PAGE.toString();
	public static readonly viewDocumentEditPage =
		ActionEnum.VIEW.toString() +
		DocumentResourceEnum.DOCUMENT_EDIT_PAGE.toString();
	public static readonly viewDocumentListPage =
		ActionEnum.VIEW.toString() +
		DocumentResourceEnum.DOCUMENT_LIST_PAGE.toString();
}
