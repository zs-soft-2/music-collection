import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import {
	CollectionItemDisposal,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemListConfig,
	CollectionItemPlacement,
} from './collection-item';

export abstract class CollectionItemStateService extends EntityStateService<
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate
> {
	/** Marks the copy as gone from the collection; it stays as history. */
	public abstract dispatchDisposeEntityAction(
		collectionItem: CollectionItemEntity,
		disposal: CollectionItemDisposal
	): void;
	/** Takes a copy gone from the collection back into it. */
	public abstract dispatchRestoreEntityAction(
		collectionItem: CollectionItemEntity
	): void;
	/**
	 * Files the copy into a compartment of the drawn shelf; `null` takes the
	 * place back and leaves the filing to the shelf again.
	 */
	public abstract dispatchPlaceEntityAction(
		collectionItem: CollectionItemEntity,
		placement: CollectionItemPlacement | null
	): void;
	/** Files several copies at once, as a rearranged compartment needs. */
	public abstract dispatchPlaceEntitiesAction(
		placements: {
			collectionItem: CollectionItemEntity;
			placement: CollectionItemPlacement | null;
		}[]
	): void;
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSetCollectionItemConfigAction(
		collectionItemListConfig: CollectionItemListConfig
	): void;
	/** An item is being added. */
	public abstract selectAdding$(): Observable<boolean>;
	/** A copy is being disposed of or restored. */
	public abstract selectDisposing$(): Observable<boolean>;
	/** A copy is being filed into a compartment, or taken out of one. */
	public abstract selectPlacing$(): Observable<boolean>;
	/**
	 * The copies gone from the signed-in user's collection, requested like
	 * `selectLoadedEntities$`.
	 */
	public abstract selectLoadedDisposedEntities$(): Observable<
		CollectionItemEntity[]
	>;
	public abstract selectCollectionItemListConfig$(): Observable<CollectionItemListConfig | null>;
	/** The error of the last failed write, `null` after a new one starts. */
	public abstract selectError$(): Observable<string | null>;
	/**
	 * The signed-in user's collection (the copies still owned), requested
	 * when not yet loaded; emits only once it has arrived, an empty
	 * collection included.
	 */
	public abstract selectLoadedEntities$(): Observable<CollectionItemEntity[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<CollectionItemEntity[]>;
}
