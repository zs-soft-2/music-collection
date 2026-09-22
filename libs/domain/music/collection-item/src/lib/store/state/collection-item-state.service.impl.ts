import { Observable, filter, first, map, switchMap, tap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	CollectionItemDisposal,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemListConfig,
	CollectionItemPlacement,
	CollectionItemStateService,
	SearchParams,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as collectionItemActions from './collection-item.actions';
import * as fromCollectionItem from './collection-item.reducer';
import * as collectionItemSelectors from './collection-item.selectors';

@Injectable()
export class CollectionItemStateServiceImpl extends CollectionItemStateService {
	private store =
		inject<Store<fromCollectionItem.CollectionItemPartialState>>(Store);

	public dispatchAddEntityAction(
		collectionItem: CollectionItemEntityAdd
	): void {
		this.store.dispatch(
			collectionItemActions.addCollectionItem({ collectionItem })
		);
	}

	public dispatchSetCollectionItemConfigAction(
		collectionItemListConfig: CollectionItemListConfig
	): void {
		this.store.dispatch(
			collectionItemActions.setCollectionItemListConfig({
				collectionItemListConfig,
			})
		);
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			collectionItemActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(
		collectionItem: CollectionItemEntity
	): void {
		this.store.dispatch(
			collectionItemActions.deleteCollectionItem({ collectionItem })
		);
	}

	public dispatchDisposeEntityAction(
		collectionItem: CollectionItemEntity,
		disposal: CollectionItemDisposal
	): void {
		this.store.dispatch(
			collectionItemActions.changeCollectionItemDisposal({
				collectionItem,
				disposal,
			})
		);
	}

	public dispatchRestoreEntityAction(
		collectionItem: CollectionItemEntity
	): void {
		this.store.dispatch(
			collectionItemActions.changeCollectionItemDisposal({
				collectionItem,
				disposal: null,
			})
		);
	}

	public dispatchPlaceEntityAction(
		collectionItem: CollectionItemEntity,
		placement: CollectionItemPlacement | null
	): void {
		this.store.dispatch(
			collectionItemActions.changeCollectionItemPlacement({
				collectionItem,
				placement,
			})
		);
	}

	public dispatchPlaceEntitiesAction(
		placements: {
			collectionItem: CollectionItemEntity;
			placement: CollectionItemPlacement | null;
		}[]
	): void {
		if (placements.length) {
			this.store.dispatch(
				collectionItemActions.changeCollectionItemPlacements({
					placements,
				})
			);
		}
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(collectionItemActions.listCollectionItems());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(collectionItemActions.loadCollectionItem({ uid }));
	}

	public dispatchSearch(params: SearchParams): void {
		this.store.dispatch(collectionItemActions.search({ params }));
	}

	public dispatchSelectCollectionItemAction(
		collectionItem: CollectionItemEntity
	): void {
		this.store.dispatch(
			collectionItemActions.selectCollectionItem({
				collectionItem,
			})
		);
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			collectionItemActions.setSelectedCollectionItemId({
				collectionItemId: entityId,
			})
		);
	}

	public dispatchUpdateEntityAction(
		collectionItem: CollectionItemEntityUpdate
	): void {
		this.store.dispatch(
			collectionItemActions.updateCollectionItem({ collectionItem })
		);
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public selectAdding$(): Observable<boolean> {
		return this.store.pipe(
			select(collectionItemSelectors.getCollectionItemAdding)
		);
	}

	public selectError$(): Observable<string | null> {
		return this.store.pipe(
			select(collectionItemSelectors.getCollectionItemError),
			map((error) => error ?? null)
		);
	}

	public selectPlacing$(): Observable<boolean> {
		return this.store.pipe(
			select(collectionItemSelectors.getCollectionItemPlacing)
		);
	}

	public selectDisposing$(): Observable<boolean> {
		return this.store.pipe(
			select(collectionItemSelectors.getCollectionItemDisposing)
		);
	}

	public selectLoadedEntities$(): Observable<CollectionItemEntity[]> {
		return this.selectOnceLoaded$(this.selectEntities$());
	}

	public selectLoadedDisposedEntities$(): Observable<
		CollectionItemEntity[]
	> {
		return this.selectOnceLoaded$(
			this.store.pipe(
				select(collectionItemSelectors.selectDisposedCollectionItems)
			)
		);
	}

	public selectEntities$(): Observable<CollectionItemEntity[]> {
		return this.store.pipe(
			select(collectionItemSelectors.selectAllCollectionItem)
		);
	}

	public selectEntityById$(
		uid: string
	): Observable<CollectionItemEntity | undefined> {
		return this.store.pipe(
			select(collectionItemSelectors.selectCollectionItemById(), { uid })
		);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(
			select(collectionItemSelectors.isNewEntityButtonEnabled)
		);
	}

	public selectCollectionItemListConfig$(): Observable<CollectionItemListConfig | null> {
		return this.store.pipe(
			select(collectionItemSelectors.selectCollectionItemListConfig)
		);
	}

	public selectSearchResult$(): Observable<CollectionItemEntity[]> {
		return this.store.pipe(
			select(collectionItemSelectors.selectSearchResult)
		);
	}

	public selectSelectedEntity$(): Observable<
		CollectionItemEntity | undefined
	> {
		return this.store.pipe(
			select(collectionItemSelectors.selectCollectionItem)
		);
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(collectionItemSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}

	/** Requests the collection when not yet loaded; emits once it arrived. */
	private selectOnceLoaded$<T>(selected$: Observable<T>): Observable<T> {
		const loaded$ = this.store.pipe(
			select(collectionItemSelectors.getCollectionItemLoaded)
		);

		return loaded$.pipe(
			first(),
			tap((loaded) => {
				if (!loaded) {
					this.dispatchListEntitiesAction();
				}
			}),
			switchMap(() => loaded$),
			filter(Boolean),
			first(),
			switchMap(() => selected$)
		);
	}
}
