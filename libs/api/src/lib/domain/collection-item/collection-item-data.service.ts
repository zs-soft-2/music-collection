import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
} from './collection-item';

export abstract class CollectionItemDataService extends EntityDataService<
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate
> {
	public abstract listByIds$(
		ids: string[]
	): Observable<CollectionItemModel[]>;
	public abstract search$(query: string): Observable<CollectionItemModel[]>;
}
