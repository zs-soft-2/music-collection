import { TestBed } from '@angular/core/testing';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	CollectionItemDisposalStatus,
	CollectionItemEntity,
} from '@music-collection/api';
import { Store, provideState, provideStore } from '@ngrx/store';

import * as collectionItemActions from './collection-item.actions';
import { collectionItemReducer } from './collection-item.reducer';
import { getCollectionItemDisposalStatus } from './collection-item.selectors';

const copy = { uid: 'c1', userId: 'u1' } as CollectionItemEntity;

/** Every value the disposal status took, in order, from the real reducer. */
function record(store: Store): CollectionItemDisposalStatus[] {
	const seen: CollectionItemDisposalStatus[] = [];

	store
		.select(getCollectionItemDisposalStatus)
		.subscribe((status) => seen.push(status));

	return seen;
}

describe('getCollectionItemDisposalStatus', () => {
	let store: Store;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [
				provideStore(),
				provideState(
					COLLECTION_ITEM_FEATURE_KEY,
					collectionItemReducer
				),
			],
		});
		store = TestBed.inject(Store);
	});

	/**
	 * The whole point of reading the two together. A refused write turns the
	 * flag off and sets the error in one state, so whoever follows a disposal
	 * to its end must never be shown a step where the write has finished and
	 * the error is still the one from before — that step reads exactly like a
	 * write that went through, and the page would close the dialog, drop the
	 * message and hand a numbered copy's number back to the registry.
	 */
	it('reports a refusal in one step, flag and error together', () => {
		const seen = record(store);

		store.dispatch(
			collectionItemActions.changeCollectionItemDisposal({
				collectionItem: copy,
				disposal: { reason: 'sold', date: 1, note: null },
			})
		);
		store.dispatch(
			collectionItemActions.changeCollectionItemDisposalFail({
				error: new Error('permission-denied'),
			})
		);

		expect(seen).toEqual([
			{ disposing: false, error: null },
			{ disposing: true, error: null },
			{ disposing: false, error: 'permission-denied' },
		]);
	});

	it('says nothing is wrong when the copy was written', () => {
		const seen = record(store);

		store.dispatch(
			collectionItemActions.changeCollectionItemDisposal({
				collectionItem: copy,
				disposal: null,
			})
		);
		store.dispatch(
			collectionItemActions.changeCollectionItemDisposalSuccess({
				collectionItem: { id: 'c1', changes: {} },
			})
		);

		expect(seen).toEqual([
			{ disposing: false, error: null },
			{ disposing: true, error: null },
			{ disposing: false, error: null },
		]);
	});

	/** A state change of any other kind must not wake the followers. */
	it('stays quiet while the collection is being loaded', () => {
		const seen = record(store);

		store.dispatch(collectionItemActions.listCollectionItems());

		expect(seen).toEqual([{ disposing: false, error: null }]);
	});
});
