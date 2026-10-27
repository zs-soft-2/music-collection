import { Observable } from 'rxjs';

import { EntityStateService } from '@music-collection/common/api';
import {
	EntityCounts,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from './entity-quantity';

export abstract class EntityQuantityStateService extends EntityStateService<
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate
> {
	/** Requests live counts of the given entity types. */
	public abstract dispatchCountEntitiesAction(types: string[]): void;
	/** The live counts received so far. */
	public abstract selectEntityCounts$(): Observable<EntityCounts>;
	/** Whether a count request is in flight. */
	public abstract selectEntityCountsLoading$(): Observable<boolean>;
}
