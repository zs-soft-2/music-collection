import { Observable } from 'rxjs';

import { SearchParams } from '@music-collection/common/api';

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

	/**
	 * The same search as `search$`, but over one collector's own copies. A
	 * collection group would answer the same question about everybody's
	 * shelves, and nobody's shelf is anyone else's business.
	 */
	public abstract searchByUser$(
		userId: string,
		params: SearchParams
	): Observable<CollectionItemModel[]>;
}
