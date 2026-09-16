import { localStorageSync } from 'ngrx-store-localstorage';

import { Action, ActionReducer, MetaReducer } from '@ngrx/store';

/** Entity slices stored by earlier versions, no longer read. */
const OBSOLETE_STORAGE_KEYS = [
	'album',
	'artist',
	'collection-item',
	'document',
];

try {
	OBSOLETE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
} catch {
	// Storage unavailable — nothing to clean up.
}

function localStorageSyncReducer(
	reducer: ActionReducer<unknown>
): ActionReducer<unknown> {
	return localStorageSync({
		// Entity slices are not stored here: Firestore's persistent cache serves
		// their lists (FirestoreSyncService), and restoring them would skip the
		// sync. Not even a part of them: a restored partial slice replaces the
		// feature's initial state, which leaves the entity adapter without `ids`.
		keys: [
			{
				authentication: ['authenticatedUser'],
			},
		],
		rehydrate: true,
	})(reducer);
}

export const metaReducers: Array<MetaReducer<any, Action>> = [
	localStorageSyncReducer,
];
