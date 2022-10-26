import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
} from './collection-item';

export abstract class CollectionItemDataService extends EntityDataService<
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate
> {
	public abstract listByIds$(
		ids: string[]
	): Observable<CollectionItemEntity[]>;
	public abstract search$(query: string): Observable<CollectionItemEntity[]>;
}
