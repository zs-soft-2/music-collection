import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import {
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate,
} from './wishlist-item';

export abstract class WishlistItemStateService extends EntityStateService<
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	/**
	 * The signed-in user's own wanted albums; follows sign-in and sign-out.
	 * The whole list (`dispatchListEntitiesAction`) is the admin's view.
	 */
	public abstract dispatchListOwnEntitiesAction(): void;
	public abstract dispatchSelectWishlistItemAction(
		wishlistItem: WishlistItemEntity
	): void;
	/** An item is being added to the wishlist. */
	public abstract selectAdding$(): Observable<boolean>;
	/** The error of the last failed write, `null` once a new one starts. */
	public abstract selectError$(): Observable<string | null>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<WishlistItemEntity[]>;
	/** An item is being changed (e.g. marked found). */
	public abstract selectUpdating$(): Observable<boolean>;
}
