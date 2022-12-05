import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity } from '../album';
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
	public abstract dispatchSelectWishlistItemAction(
		wishlistItem: WishlistItemEntity
	): void;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<WishlistItemEntity[]>;
}
