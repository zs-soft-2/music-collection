import { WishlistItemEntity } from './wishlist-item';

export abstract class WishlistItemHookService {
	public abstract selectEntity(wishlistItem: WishlistItemEntity): void;
}
