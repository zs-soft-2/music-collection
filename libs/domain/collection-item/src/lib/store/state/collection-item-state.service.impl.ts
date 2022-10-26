import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as collectionItemActions from './collection-item.actions';
import * as fromCollectionItem from './collection-item.reducer';
import * as collectionItemSelectors from './collection-item.selectors';

@Injectable()
export class CollectionItemStateServiceImpl extends CollectionItemStateService {
	public constructor(
		private store: Store<fromCollectionItem.CollectionItemPartialState>
	) {
		super();
	}

	public dispatchAddEntityAction(
		collectionItem: CollectionItemEntityAdd
	): void {
		this.store.dispatch(
			collectionItemActions.addCollectionItem({ collectionItem })
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

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(collectionItemActions.listCollectionItems());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(collectionItemActions.loadCollectionItem({ uid }));
	}

	public dispatchSearch(term: string): void {
		this.store.dispatch(collectionItemActions.search({ term }));
	}

	public dispatchSelectCollectionItemAction(uid: string): void {
		this.store.dispatch(
			collectionItemActions.selectCollectionItem({
				collectionItemId: uid,
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
}
