import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemListConfig,
} from './collection-item';

export abstract class CollectionItemStateService extends EntityStateService<
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSetCollectionItemConfigAction(
		collectionItemListConfig: CollectionItemListConfig
	): void;
	/** An item is being added. */
	public abstract selectAdding$(): Observable<boolean>;
	public abstract selectCollectionItemListConfig$(): Observable<CollectionItemListConfig | null>;
	/** The error of the last failed write, `null` after a new one starts. */
	public abstract selectError$(): Observable<string | null>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<CollectionItemEntity[]>;
}
