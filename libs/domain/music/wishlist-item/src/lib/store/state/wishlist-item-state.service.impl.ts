import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate,
	WishlistItemStateService,
	SearchParams,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as wishlistItemActions from './wishlist-item.actions';
import * as fromWishlistItem from './wishlist-item.reducer';
import * as wishlistItemSelectors from './wishlist-item.selectors';

@Injectable()
export class WishlistItemStateServiceImpl extends WishlistItemStateService {
	private store =
		inject<Store<fromWishlistItem.WishlistItemPartialState>>(Store);

	public dispatchAddEntityAction(wishlistItem: WishlistItemEntityAdd): void {
		this.store.dispatch(
			wishlistItemActions.addWishlistItem({ wishlistItem })
		);
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			wishlistItemActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(wishlistItem: WishlistItemEntity): void {
		this.store.dispatch(
			wishlistItemActions.deleteWishlistItem({ wishlistItem })
		);
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(wishlistItemActions.listWishlistItems());
	}

	public dispatchListOwnEntitiesAction(): void {
		this.store.dispatch(wishlistItemActions.listOwnWishlistItems());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(wishlistItemActions.loadWishlistItem({ uid }));
	}

	public dispatchSearch(params: SearchParams): void {
		this.store.dispatch(wishlistItemActions.search({ params }));
	}

	public dispatchSelectWishlistItemAction(
		wishlistItem: WishlistItemEntity
	): void {
		this.store.dispatch(
			wishlistItemActions.selectWishlistItem({ wishlistItem })
		);
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			wishlistItemActions.setSelectedWishlistItemId({
				wishlistItemId: entityId,
			})
		);
	}

	public dispatchUpdateEntityAction(
		wishlistItem: WishlistItemEntityUpdate
	): void {
		this.store.dispatch(
			wishlistItemActions.updateWishlistItem({ wishlistItem })
		);
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public selectAdding$(): Observable<boolean> {
		return this.store.pipe(
			select(wishlistItemSelectors.getWishlistItemAdding)
		);
	}

	public selectEntities$(): Observable<WishlistItemEntity[]> {
		return this.store.pipe(
			select(wishlistItemSelectors.selectAllWishlistItem)
		);
	}

	public selectEntityById$(
		uid: string
	): Observable<WishlistItemEntity | undefined> {
		return this.store.pipe(
			select(wishlistItemSelectors.selectWishlistItemById(), { uid })
		);
	}

	public selectError$(): Observable<string | null> {
		return this.store.pipe(
			select(wishlistItemSelectors.getWishlistItemError),
			map((error) => error ?? null)
		);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(
			select(wishlistItemSelectors.isNewEntityButtonEnabled)
		);
	}

	public selectSearchResult$(): Observable<WishlistItemEntity[]> {
		return this.store.pipe(
			select(wishlistItemSelectors.selectSearchResult)
		);
	}

	public selectSelectedEntity$(): Observable<WishlistItemEntity | undefined> {
		return this.store.pipe(
			select(wishlistItemSelectors.selectWishlistItem)
		);
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(wishlistItemSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}

	public selectUpdating$(): Observable<boolean> {
		return this.store.pipe(
			select(wishlistItemSelectors.getWishlistItemUpdating)
		);
	}
}
