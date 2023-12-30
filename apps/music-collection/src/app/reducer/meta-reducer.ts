import { localStorageSync } from 'ngrx-store-localstorage';

import { Action, ActionReducer, MetaReducer } from '@ngrx/store';

function localStorageSyncReducer(
	reducer: ActionReducer<unknown>
): ActionReducer<unknown> {
	return localStorageSync({
		keys: [
			{
				album: ['ids', 'entities'],
			},
			{
				artist: ['ids', 'entities'],
			},
			{
				authentication: ['authenticatedUser'],
			},
			{
				'collection-item': ['ids', 'entities', 'isNewEntityButtonEnabled', 'collectionItemListConfig'],
			},
			{
				document: ['ids', 'entities'],
			},
		],
		rehydrate: true,
	})(reducer);
}

export const metaReducers: Array<MetaReducer<unknown, Action>> = [
	localStorageSyncReducer,
];
