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
	public abstract dispatchListAlbumsByIdAction(uid: string): void;
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSelectWishlistItemAction(
		wishlistItem: WishlistItemEntity
	): void;
	public abstract selectAlbumsById$(
		wishlistItemId: string
	): Observable<AlbumEntity[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<WishlistItemEntity[]>;
}
