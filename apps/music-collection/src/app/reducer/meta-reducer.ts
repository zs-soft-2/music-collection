import { localStorageSync } from 'ngrx-store-localstorage';

import { Action, ActionReducer, MetaReducer } from '@ngrx/store';

/** Entity lists stored by earlier versions, no longer read. */
const OBSOLETE_STORAGE_KEYS = ['album', 'artist', 'document'];

try {
	OBSOLETE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
} catch {
	// Storage unavailable — nothing to clean up.
}

function localStorageSyncReducer(
	reducer: ActionReducer<unknown>
): ActionReducer<unknown> {
	return localStorageSync({
		// Entity lists are not stored here: Firestore's persistent cache serves
		// them (FirestoreSyncService), and restoring them would skip the sync.
		keys: [
			{
				authentication: ['authenticatedUser'],
			},
			{
				'collection-item': [
					'isNewEntityButtonEnabled',
					'collectionItemListConfig',
				],
			},
		],
		rehydrate: true,
	})(reducer);
}

export const metaReducers: Array<MetaReducer<any, Action>> = [
	localStorageSyncReducer,
];
