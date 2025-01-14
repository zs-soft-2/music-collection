import { MenuItem } from 'primeng/api';
import { of, pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import { AlbumEntity, ArtistDetailViewStateModel } from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ArtistDetailViewService } from './artist-detail-view.service';

const menuItems: MenuItem[] = [
	{
		label: 'Info',
		icon: '',
	},
	{
		label: 'Discography',
		icon: '',
	},
	{
		label: 'Members',
		icon: '',
	},
];

const initialArtistDetailViewstateModel: ArtistDetailViewStateModel = {
	activeMenuItem: menuItems[0],
	albums: [],
	artist: null,
	country: null,
	isLoading: false,
	menuItems: [],
	selectedContent: null,
};

const menuItemNames = ['info', 'discography', 'members'];

export const ArtistDetailViewStore = signalStore(
	withState(initialArtistDetailViewstateModel),
	withMethods(
		(store, artistDetailViewService = inject(ArtistDetailViewService)) => ({
			init: rxMethod(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() => artistDetailViewService.getData()),
					tapResponse({
						next: (data: any[]) => {
							patchState(store, {
								albums: data[1],
								artist: data[0] || null,
								activeMenuItem:
									menuItems[
										menuItemNames.findIndex(
											(menuItemName) =>
												menuItemName ===
												store.selectedContent(),
										) || 0
									],
								country: null,
								isLoading: false,
								menuItems,
								selectedContent: store.selectedContent() || 'info',
							});
						},
						error: console.error,
						finalize: () => patchState(store, { isLoading: false }),
					}),
				),
			),
			selectAlbumDetail: (album: AlbumEntity): void => {
				artistDetailViewService.selectAlbumDetail(album);
			},
			activeItemChange: (activeMenuItem: MenuItem): void => {
				patchState(store, { activeMenuItem });
				patchState(store, {
					selectedContent: activeMenuItem?.label?.toLowerCase(),
				});

				if (activeMenuItem?.label === 'Discography') {
					artistDetailViewService.dispatchListAlbumsByIdAction(
						store.artist()?.uid || '',
					);
				}
			},
		}),
	),
	withHooks({
		onInit({ init }) {
			init(of(''));
		},
	}),
);
