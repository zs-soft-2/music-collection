import { Observable } from 'rxjs';

import {
	EntityCounts,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from '@music-collection/core-api';

import { FirebaseDataService } from '../firebase';

export abstract class EntityQuantityDataService extends FirebaseDataService<
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate
> {
	/** Counts the documents of the given entity types on the server. */
	public abstract count$(types: string[]): Observable<EntityCounts>;
}
