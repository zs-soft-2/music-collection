import { FormGroup } from '@angular/forms';

import { EntityUtilService } from '../../common';
import { User } from '../../core';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
} from './collection-item';

export abstract class CollectionItemUtilService extends EntityUtilService<
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate
> {
	public abstract createFormGroupByUser(
		entity: CollectionItemEntity | undefined,
		user: User | undefined
	): FormGroup;
}
