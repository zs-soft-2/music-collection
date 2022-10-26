import { Observable } from 'rxjs';

import { EntityStateService } from '../../common';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
} from './collection-item';

export abstract class CollectionItemStateService extends EntityStateService<
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSearch(term: string): void;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<CollectionItemEntity[]>;
}
