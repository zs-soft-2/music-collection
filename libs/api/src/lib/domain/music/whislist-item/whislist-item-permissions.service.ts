import { ActionEnum } from '../../../core';
import { WhislistItemResourceEnum } from './whislist-item-resource.enum';

export class WhislistItemPermissionsService {
	static readonly createWhislistItemEntity =
		ActionEnum.CREATE.toString() +
		WhislistItemResourceEnum.WHISLIST_ITEM_ENTITY.toString();
	static readonly deleteWhislistItemEntity =
		ActionEnum.DELETE.toString() +
		WhislistItemResourceEnum.WHISLIST_ITEM_ENTITY.toString();
	static readonly updateWhislistItemEntity =
		ActionEnum.UPDATE.toString() +
		WhislistItemResourceEnum.WHISLIST_ITEM_ENTITY.toString();
	static readonly viewWhislistItemEntity =
		ActionEnum.VIEW.toString() +
		WhislistItemResourceEnum.WHISLIST_ITEM_ENTITY.toString();
}
