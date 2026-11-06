import { combineLatest, pairwise, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemPlacement,
	CollectionItemStateService,
} from '@music-collection/api';
import {
	patchState,
	signalStoreFeature,
	type,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { UserSettingsEffect } from '../../../data/user-settings';
import type { ReleaseView } from '../../../shared/music-ui';
import {
	NO_SHELF_LAYOUT,
	SHELF_LAYOUT_SETTING,
	ShelfUnitLayout,
} from '../../collection/shelf-layout.setting';
import { placementInLayout } from '../../collection/shelf-placement';

interface AlbumPlacementState {
	/** The copy the placement dialog is open for. */
	placingCopyId: string | null;
	placing: boolean;
	placeError: string | null;
	/** The furniture the collector drew in their profile; empty for none. */
	shelfUnits: ShelfUnitLayout[];
}

const initialState: AlbumPlacementState = {
	placingCopyId: null,
	placing: false,
	placeError: null,
	shelfUnits: NO_SHELF_LAYOUT.units,
};

/**
 * Filing a copy of the album into the furniture the collector drew, from the
 * album page. The dialog closes once the place is saved.
 */
export function withAlbumPlacement() {
	return signalStoreFeature(
		{
			state: type<{
				releases: ReleaseView[];
				ownedItems: CollectionItemEntity[];
				canManageCopies: boolean;
			}>(),
		},
		withState(initialState),
		withComputed((store) => ({
			/** The copy the placement dialog is open for. */
			placingCopy: computed(
				() =>
					store
						.releases()
						.find(
							(release) => release.id === store.placingCopyId()
						) ?? null
			),
			/**
			 * Where the collector's other copies stand in the room — the copy
			 * being placed left out, so the picker counts the compartment it
			 * is about to leave without it.
			 */
			filedElsewhere: computed<CollectionItemPlacement[]>(() =>
				store
					.releases()
					.filter(
						(release) =>
							release.id !== store.placingCopyId() &&
							release.placement
					)
					.map(
						(release) =>
							release.placement as CollectionItemPlacement
					)
			),
			/** The collector can only file a copy into furniture they drew. */
			canPlaceCopies: computed(
				() => store.canManageCopies() && store.shelfUnits().length > 0
			),
		})),
		withMethods(
			(
				store,
				settingsEffect = inject(UserSettingsEffect),
				collectionItemStateService = inject(CollectionItemStateService)
			) => ({
				/** The drawn furniture, and any later change to it. */
				loadShelfLayout: rxMethod<void>(
					pipe(
						switchMap(() =>
							settingsEffect.value$(SHELF_LAYOUT_SETTING)
						),
						tap(({ units }) =>
							patchState(store, { shelfUnits: units })
						)
					)
				),
				/** Follows a placement; the dialog closes once the place is saved. */
				watchPlacing: rxMethod<void>(
					pipe(
						switchMap(() =>
							combineLatest([
								collectionItemStateService.selectPlacing$(),
								collectionItemStateService.selectError$(),
							])
						),
						pairwise(),
						tap(([[wasPlacing], [placing, error]]) => {
							patchState(store, { placing });
							if (wasPlacing && !placing) {
								patchState(store, {
									placeError: error,
									placingCopyId: error
										? store.placingCopyId()
										: null,
								});
							}
						})
					)
				),
				/**
				 * Files the copy into the compartment the collector picked, or
				 * takes the place back with `null` and leaves the filing to the
				 * shelf again.
				 */
				placeCopy(placement: CollectionItemPlacement | null): void {
					const item = store
						.ownedItems()
						.find((owned) => owned.uid === store.placingCopyId());

					if (!item || !store.canManageCopies() || store.placing()) {
						return;
					}

					patchState(store, { placeError: null });
					collectionItemStateService.dispatchPlaceEntityAction(
						item,
						placement &&
							placementInLayout(placement, store.shelfUnits())
					);
				},
				openPlacement(copyId: string): void {
					patchState(store, {
						placingCopyId: copyId,
						placeError: null,
					});
				},
				closePlacement(): void {
					patchState(store, { placingCopyId: null });
				},
			})
		)
	);
}
