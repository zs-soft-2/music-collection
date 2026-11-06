import {
	combineLatest,
	firstValueFrom,
	pairwise,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemStateService,
	EntityTypeEnum,
	GenericReleaseMedia,
	ReleaseEntity,
	ReleaseStateService,
	genericReleaseUid,
	toCollectionItemSerial,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	type,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { CopySerialEffect } from '../../../data/copy-serial';
import { ReleaseRequestEffect } from '../../../data/release-request';
import type { ReleaseView } from '../../../shared/music-ui';
import type { CopyPick } from '../component/release-picker/release-picker.component';
import { toReleaseOptions } from '../album.mapper';
import {
	albumOf,
	describeError,
	entities$,
	ownsRelease,
	toSerialError,
} from './album-page.helpers';

interface AlbumCopyAddingState {
	/** Every release of the catalog; loaded when the picker first opens. */
	catalogReleases: ReleaseEntity[];
	catalogReleasesLoading: boolean;
	adding: boolean;
	addError: string | null;
	/**
	 * A number is being taken for a copy about to be added. Its own round
	 * trip, before the write the picker waits on — the dialog has to be held
	 * shut over it too, or a second press would start the add again.
	 */
	claiming: boolean;
	/**
	 * The number taken for a copy that is being written. Given back if the
	 * write is refused, so a copy that never arrived locks nothing away.
	 */
	claimedSerial: { releaseId: string; number: number } | null;
	/**
	 * The album's generic release is being fetched — or made, for the first
	 * such copy — before the copy of it can be written.
	 */
	preparingGeneric: boolean;
}

const initialState: AlbumCopyAddingState = {
	catalogReleases: [],
	catalogReleasesLoading: true,
	adding: false,
	addError: null,
	claiming: false,
	claimedSerial: null,
	preparingGeneric: false,
};

/**
 * Adding a copy of the album from the picker: a pressing of the catalog,
 * numbered or not, or the album on a medium with no pressing named. The
 * picker closes once the copy is saved.
 */
export function withAlbumCopyAdding() {
	return signalStoreFeature(
		{
			state: type<{
				albumId: string | null;
				albums: AlbumEntity[];
				userId: string | null;
				releases: ReleaseView[];
				ownedItems: CollectionItemEntity[];
				pickerOpen: boolean;
			}>(),
		},
		withState(initialState),
		withComputed((store) => ({
			/** The album's catalog releases to pick the collected one from. */
			releaseOptions: computed(() => {
				const albumId = store.albumId();
				// Pressing → the collector's copy of it, so the picker can
				// offer to let that copy go where it says it is owned.
				const owned = new Map(
					store
						.releases()
						.filter((release) => release.albumId === albumId)
						.flatMap((release) =>
							release.releaseId
								? [[release.releaseId, release.id] as const]
								: []
						)
				);

				// The generic releases are not pressings to pick from: they
				// are offered by medium, in the picker's own view.
				return toReleaseOptions(
					store
						.catalogReleases()
						.filter(
							(release) =>
								release.album?.uid === albumId &&
								!release.generic
						),
					owned
				);
			}),
			/** The media the collector has the album on without a pressing. */
			ownedGenericMedia: computed(() => {
				const albumId = store.albumId();

				return store
					.ownedItems()
					.filter(
						(item) =>
							item.release?.generic &&
							item.release.album?.uid === albumId
					)
					.map((item) => item.release.media as GenericReleaseMedia);
			}),
		})),
		withMethods(
			(
				store,
				collectionItemStateService = inject(CollectionItemStateService),
				releaseStateService = inject(ReleaseStateService),
				releaseRequestEffect = inject(ReleaseRequestEffect),
				serialEffect = inject(CopySerialEffect)
			) => ({
				loadCatalogReleases: rxMethod<void>(
					pipe(
						switchMap(() =>
							entities$(
								() => releaseStateService.selectEntities$(),
								() =>
									releaseStateService.dispatchListEntitiesAction()
							).pipe(
								tapResponse({
									next: (catalogReleases) =>
										patchState(store, {
											catalogReleases,
											catalogReleasesLoading: false,
										}),
									error: (error) => {
										console.error(error);
										patchState(store, {
											catalogReleasesLoading: false,
										});
									},
								})
							)
						)
					)
				),
				/** Follows the add; the picker closes once the copy is saved. */
				watchAdding: rxMethod<void>(
					pipe(
						switchMap(() =>
							combineLatest([
								collectionItemStateService.selectAdding$(),
								collectionItemStateService.selectError$(),
							])
						),
						pairwise(),
						tap(([[wasAdding], [adding, error]]) => {
							patchState(store, { adding });
							if (!wasAdding || adding) {
								return;
							}
							const claimed = store.claimedSerial();

							patchState(store, {
								addError: error,
								pickerOpen: !!error,
								claimedSerial: null,
							});
							// The copy never arrived; the number it was taking
							// goes back, or nobody could ever register it.
							if (error && claimed) {
								void serialEffect.release(
									claimed.releaseId,
									claimed.number
								);
							}
						})
					)
				),
				/**
				 * Adds a copy of the release to the signed-in user's collection,
				 * unless it is already in it (an approved release request adds it
				 * on its own).
				 */
				async addToCollection(pick: CopyPick): Promise<void> {
					const release = store
						.catalogReleases()
						.find((item) => item.uid === pick.releaseId);
					const userId = store.userId();

					if (
						!release ||
						!userId ||
						store.adding() ||
						store.claiming()
					) {
						return;
					}
					if (ownsRelease(store.ownedItems(), pick.releaseId)) {
						patchState(store, {
							addError:
								'This release is already in your collection.',
						});
						return;
					}
					const serial = toCollectionItemSerial(
						pick.serialNumber,
						pick.serialTotal
					);

					patchState(store, { addError: null });

					// The number is taken before the copy is written, because the
					// rules refuse a copy carrying a number it does not hold. The
					// claim cannot name the copy yet — it does not exist — and it
					// can never be edited, so it stays pointing at nothing.
					if (serial) {
						patchState(store, { claiming: true });
						try {
							await serialEffect.hold(
								pick.releaseId,
								serial,
								userId,
								null
							);
						} catch (error) {
							patchState(store, {
								claiming: false,
								addError: toSerialError(error),
							});
							return;
						}
						patchState(store, { claiming: false });
					}

					const collectionItem: CollectionItemEntityAdd = {
						entityType: EntityTypeEnum.CollectionItem,
						date: new Date(),
						release,
						serial,
						userId,
					};

					patchState(store, {
						// A refused add gives the number straight back, so a copy
						// that never arrived locks nothing away.
						claimedSerial: serial
							? {
									releaseId: pick.releaseId,
									number: serial.number,
								}
							: null,
					});
					collectionItemStateService.dispatchAddEntityAction(
						collectionItem
					);
				},
				/**
				 * Adds the album on a medium, without a pressing: the collector
				 * knows it is a vinyl or a CD of it and nothing more. The copy is
				 * of the album's generic release, which the server makes for the
				 * first such copy; from there it is added like any other copy,
				 * only without a number — a numbered edition is a pressing.
				 */
				async addGenericCopy(
					media: GenericReleaseMedia
				): Promise<void> {
					const album = albumOf(store.albums(), store.albumId());
					const userId = store.userId();

					if (
						!album?.artist?.uid ||
						!userId ||
						store.adding() ||
						store.claiming() ||
						store.preparingGeneric()
					) {
						return;
					}
					if (
						ownsRelease(
							store.ownedItems(),
							genericReleaseUid(album.uid, media)
						)
					) {
						patchState(store, {
							addError:
								'This album is already in your collection on this format.',
						});
						return;
					}

					patchState(store, {
						addError: null,
						preparingGeneric: true,
					});

					let release: ReleaseEntity;

					try {
						release = await firstValueFrom(
							releaseRequestEffect.ensureGenericRelease$(
								album.artist.uid,
								album.uid,
								media
							)
						);
					} catch (error) {
						console.error(error);
						const code = (error as { code?: string })?.code ?? '';

						patchState(store, {
							preparingGeneric: false,
							// Here it is the album the server did not find, not
							// a Discogs one.
							addError: code.endsWith('not-found')
								? 'This album is no longer in the catalog.'
								: describeError(error),
						});
						return;
					}

					patchState(store, { preparingGeneric: false });

					const collectionItem: CollectionItemEntityAdd = {
						entityType: EntityTypeEnum.CollectionItem,
						date: new Date(),
						release,
						userId,
					};

					collectionItemStateService.dispatchAddEntityAction(
						collectionItem
					);
				},
			})
		)
	);
}
