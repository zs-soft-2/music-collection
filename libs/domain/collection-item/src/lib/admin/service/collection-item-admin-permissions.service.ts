import { Injectable } from '@angular/core';
import {
	ActionEnum,
	CollectionItemPermissionsService,
	CollectionItemResourceEnum,
} from '@music-collection/api';

@Injectable()
export class CollectionItemAdminPermissionsService extends CollectionItemPermissionsService {
	public static readonly viewCollectionItemAdminPage =
		ActionEnum.VIEW.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_ADMIN_PAGE.toString();
	public static readonly viewCollectionItemEditPage =
		ActionEnum.VIEW.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_EDIT_PAGE.toString();
	public static readonly viewCollectionItemListPage =
		ActionEnum.VIEW.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_LIST_PAGE.toString();
}
