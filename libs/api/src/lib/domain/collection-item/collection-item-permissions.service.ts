import { ActionEnum } from '../../core';
import { CollectionItemResourceEnum } from './collection-item-resource.enum';

export class CollectionItemPermissionsService {
	static readonly createCollectionItemEntity =
		ActionEnum.CREATE.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_ENTITY.toString();
	static readonly deleteCollectionItemEntity =
		ActionEnum.DELETE.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_ENTITY.toString();
	static readonly updateCollectionItemEntity =
		ActionEnum.UPDATE.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_ENTITY.toString();
	static readonly viewCollectionItemEntity =
		ActionEnum.VIEW.toString() +
		CollectionItemResourceEnum.COLLECTION_ITEM_ENTITY.toString();
}
