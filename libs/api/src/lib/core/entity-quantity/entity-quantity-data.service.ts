import { Observable } from 'rxjs';

import { FirebaseDataService } from '../firebase';
import {
	EntityCounts,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from './entity-quantity';

export abstract class EntityQuantityDataService extends FirebaseDataService<
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate
> {
	/** Counts the documents of the given entity types on the server. */
	public abstract count$(types: string[]): Observable<EntityCounts>;
}
