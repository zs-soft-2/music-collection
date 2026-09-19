import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
} from './collection-item';

export abstract class CollectionItemDataService extends FirebaseDataService<
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate
> {
	/** The items of one user's collection (`user/{userId}/collection-item`). */
	public abstract listByUser$(
		userId: string
	): Observable<CollectionItemModel[]>;
}
