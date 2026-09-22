import {
	combineLatest,
	distinctUntilChanged,
	filter,
	map,
	of,
	pairwise,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AuthenticationStateService,
	COLLECTION_ITEM_PHOTO_LIMIT,
	CollectionItemDetails,
	CollectionItemEntity,
	CollectionItemGrade,
	CollectionItemPermissionsService,
	CollectionItemPhoto,
	CollectionItemStateService,
	ContributionEntity,
	RoleNames,
	TrackEntity,
} from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { NgxPermissionsService } from 'ngx-permissions';

import { AlbumDetailsEffect } from '../../data/album-details';
import { CopyPhotoEffect } from '../../data/copy-photo';
import { toAlbumProfile } from '../album/album.mapper';
import {
	toCopyCondition,
	toCopyPhotos,
	toCopyPressing,
	toCopyProvenance,
	toCopyTracks,
} from './collection-item.mapper';

/** Which picture a file is chosen for: the one shown, or the one behind it. */
export type PhotoSlot = 'front' | 'back';

/**
 * The edit form, as the page holds it while it is being typed. The price and
 * the date are kept as the strings the inputs give, because a half-typed
 * number is a state the form has to survive.
 */
export interface CopyDraft {
	description: string;
	purchaseDate: string;
	purchasePlace: string;
	purchasePrice: string;
	purchaseCurrency: string;
	mediaGrade: CollectionItemGrade | null;
	sleeveGrade: CollectionItemGrade | null;
	story: string;
}

interface CollectionItemPageState {
	itemId: string;
	/** The copy, once the collection has arrived. */
	item: CollectionItemEntity | null;
	itemLoading: boolean;
	/** The collection arrived and holds no copy under this id. */
	notFound: boolean;
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
	detailsLoading: boolean;
	userId: string | null;
	canEdit: boolean;
	editing: boolean;
	draft: CopyDraft;
	saving: boolean;
	/** Which write is in flight — the two share one flag in the store. */
	savingKind: 'details' | 'photos' | null;
	saveError: string | null;
	/** A picture is being scaled and uploaded for this slot. */
	photoBusy: PhotoSlot | null;
	photoError: string | null;
	/**
	 * Pictures the copy no longer points at, waiting for the write that
	 * dropped them to go through. Deleting them any earlier would leave the
	 * document pointing at a file that is gone if the write failed — a
	 * broken page, where the other order only leaves a few unread kilobytes.
	 */
	pendingDiscard: CollectionItemPhoto[];
}

const EMPTY_DRAFT: CopyDraft = {
	description: '',
	purchaseDate: '',
	purchasePlace: '',
	purchasePrice: '',
	purchaseCurrency: '',
	mediaGrade: null,
	sleeveGrade: null,
	story: '',
};

const initialState: CollectionItemPageState = {
	itemId: '',
	item: null,
	itemLoading: true,
	notFound: false,
	tracks: [],
	contributions: [],
	detailsLoading: true,
	userId: null,
	canEdit: false,
	editing: false,
	draft: EMPTY_DRAFT,
	saving: false,
	savingKind: null,
	saveError: null,
	photoBusy: null,
	photoError: null,
	pendingDiscard: [],
};

/** The default currency of a price typed without one. */
const DEFAULT_CURRENCY = 'HUF';

const STORY_MAX_LENGTH = 5000;

/** The copy as the form reads it: entity in, draft out. */
function toDraft(item: CollectionItemEntity): CopyDraft {
	const purchase = item.purchase ?? null;

	return {
		description: item.description ?? '',
		purchaseDate: purchase?.date ? toDateInput(purchase.date) : '',
		purchasePlace: purchase?.place ?? '',
		purchasePrice: purchase?.price != null ? String(purchase.price) : '',
		purchaseCurrency: purchase?.currency ?? '',
		mediaGrade: item.condition?.media ?? null,
		sleeveGrade: item.condition?.sleeve ?? null,
		story: item.story ?? '',
	};
}

/** `yyyy-mm-dd`, what a date input reads and writes. */
function toDateInput(epochMs: number): string {
	const date = new Date(epochMs);
	const pad = (value: number) => String(value).padStart(2, '0');

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate()
	)}`;
}

/**
 * The draft as the record keeps it. A date is read at noon rather than at
 * midnight: a purchase is a day, not a moment, and midnight in one time zone
 * is the day before in another.
 */
function toDetails(draft: CopyDraft): CollectionItemDetails {
	const place = draft.purchasePlace.trim();
	const parsedDate = draft.purchaseDate
		? new Date(`${draft.purchaseDate}T12:00:00`).getTime()
		: NaN;
	const date = Number.isFinite(parsedDate) ? parsedDate : null;
	const parsedPrice = Number(draft.purchasePrice.replace(',', '.'));
	const price =
		draft.purchasePrice.trim() &&
		Number.isFinite(parsedPrice) &&
		parsedPrice >= 0
			? parsedPrice
			: null;
	const currency =
		price == null
			? null
			: draft.purchaseCurrency.trim().toUpperCase().slice(0, 3) ||
				DEFAULT_CURRENCY;
	const story = draft.story.trim().slice(0, STORY_MAX_LENGTH);
	const purchaseEmpty = date === null && !place && price === null;
	const conditionEmpty = !draft.mediaGrade && !draft.sleeveGrade;

	return {
		description: draft.description.trim(),
		purchase: purchaseEmpty
			? null
			: { date, place: place || null, price, currency },
		condition: conditionEmpty
			? null
			: { media: draft.mediaGrade, sleeve: draft.sleeveGrade },
		story: story || null,
	};
}

/**
 * The copy page: one record on one shelf, read down from the album it is a
 * recording of, through the pressing it came out on, to the copy itself.
 *
 * Only the signed-in collector's own copies open here. What is on this page
 * beyond the catalog — what was paid, where it was found, the story, the
 * photographs — is the collector's own, and there is nothing to show a
 * visitor who is not them.
 */
export const CollectionItemPageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** The album this copy is a recording of, as the catalog holds it. */
		album: computed(() => {
			const album = store.item()?.release?.album;

			return album ? toAlbumProfile(album) : null;
		}),
		/** The pressing: what the release adds to the album. */
		pressing: computed(() => {
			const item = store.item();

			return item ? toCopyPressing(item) : null;
		}),
		provenance: computed(() => {
			const item = store.item();

			return item ? toCopyProvenance(item) : null;
		}),
		condition: computed(() => {
			const item = store.item();

			return item ? toCopyCondition(item) : null;
		}),
		photos: computed(() => toCopyPhotos(store.item()?.photos)),
		story: computed(() => store.item()?.story ?? null),
		/** The copy left the collection; the page reads as history. */
		disposal: computed(() => store.item()?.disposal ?? null),
		tracklist: computed(() =>
			toCopyTracks(store.tracks(), store.item()?.release?.uid ?? null)
		),
	})),
	withComputed((store) => ({
		/** How many tracks this pressing adds beyond the album's own. */
		exclusiveCount: computed(
			() => store.tracklist().filter((track) => track.exclusive).length
		),
		/** A picture is being scaled, uploaded or written. */
		busy: computed(
			() =>
				store.photoBusy() !== null ||
				(store.saving() && store.savingKind() === 'photos')
		),
		/**
		 * The form's own write. A photo saved next to an open form must not
		 * grey the form out, so the two are read apart.
		 */
		savingDetails: computed(
			() => store.saving() && store.savingKind() === 'details'
		),
		/** A second picture can still be added. */
		canAddPhoto: computed(
			() =>
				store.canEdit() &&
				store.photos().length < COLLECTION_ITEM_PHOTO_LIMIT
		),
	})),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			collectionItemStateService = inject(CollectionItemStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			photoEffect = inject(CopyPhotoEffect)
		) => ({
			/** Who is signed in, and whether they may change their copies. */
			loadCollector: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							authenticationStateService.selectAuthenticatedUser$(),
							permissionsService.permissions$,
						])
					),
					tap(([user, permissions]) =>
						patchState(store, {
							userId: user?.uid ?? null,
							canEdit:
								!!user?.uid &&
								(CollectionItemPermissionsService.updateCollectionItemEntity in
									permissions ||
									RoleNames.ADMIN in permissions),
						})
					)
				)
			),
			/**
			 * Follows `:itemId` and finds the copy among the collector's own —
			 * the ones on the shelf and the ones that have left it, because a
			 * record sold is still a record owned once.
			 */
			loadCopy: rxMethod<void>(
				pipe(
					switchMap(() => route.paramMap),
					map((params) => params.get('itemId') ?? ''),
					tap((itemId) =>
						patchState(store, {
							itemId,
							item: null,
							itemLoading: true,
							notFound: false,
						})
					),
					switchMap((itemId) =>
						combineLatest([
							collectionItemStateService.selectLoadedEntities$(),
							collectionItemStateService.selectLoadedDisposedEntities$(),
						]).pipe(
							map(([owned, gone]) =>
								[...owned, ...gone].find(
									(item) => item.uid === itemId
								)
							),
							tapResponse({
								next: (item) =>
									patchState(store, {
										item: item ?? null,
										itemLoading: false,
										notFound: !item,
										draft: item
											? toDraft(item)
											: EMPTY_DRAFT,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										itemLoading: false,
										notFound: true,
									});
								},
							})
						)
					)
				)
			),
			/** The tracklist of this copy: the album's, plus this pressing's. */
			loadDetails: rxMethod<{
				albumUid: string;
				releaseUid: string | null;
			}>(
				pipe(
					// Nothing to ask for until the copy says which album it
					// is a recording of.
					filter(({ albumUid }) => !!albumUid),
					distinctUntilChanged(
						(a, b) =>
							a.albumUid === b.albumUid &&
							a.releaseUid === b.releaseUid
					),
					tap(() => patchState(store, { detailsLoading: true })),
					switchMap(({ albumUid, releaseUid }) =>
						albumDetailsEffect.loadCopy$(albumUid, releaseUid).pipe(
							tapResponse({
								next: ({ tracks, contributions }) =>
									patchState(store, {
										tracks,
										contributions,
										detailsLoading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										detailsLoading: false,
									});
								},
							})
						)
					)
				)
			),
			/**
			 * Follows the write. The form and the photos share one flag in
			 * the store, so what finished is read from what was started —
			 * otherwise a photo saved while the form is open would close it
			 * halfway through the typing.
			 */
			watchSaving: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							collectionItemStateService.selectSaving$(),
							collectionItemStateService.selectError$(),
						])
					),
					pairwise(),
					tap(([[wasSaving], [saving, error]]) => {
						patchState(store, { saving });

						if (!wasSaving || saving) {
							return;
						}
						const kind = store.savingKind();

						if (kind === 'details') {
							patchState(store, {
								saveError: error,
								editing: !!error,
								savingKind: null,
							});
							return;
						}
						if (kind === 'photos') {
							const dropped = store.pendingDiscard();

							patchState(store, {
								photoError: error
									? 'A kép mentése nem sikerült. Próbáld újra.'
									: null,
								pendingDiscard: [],
								savingKind: null,
							});
							// The document no longer points at them, so the
							// files can go. A failed write left it pointing
							// where it did, so they stay.
							if (!error && dropped.length) {
								void photoEffect.discard(dropped);
							}
						}
					})
				)
			),
			edit(): void {
				const item = store.item();

				if (!item || !store.canEdit()) {
					return;
				}
				patchState(store, {
					editing: true,
					saveError: null,
					draft: toDraft(item),
				});
			},
			cancelEdit(): void {
				const item = store.item();

				patchState(store, {
					editing: false,
					saveError: null,
					draft: item ? toDraft(item) : EMPTY_DRAFT,
				});
			},
			save(draft: CopyDraft): void {
				const item = store.item();

				if (!item || !store.canEdit() || store.saving()) {
					return;
				}
				patchState(store, {
					draft,
					saveError: null,
					savingKind: 'details',
				});
				collectionItemStateService.dispatchChangeDetailsAction(
					item,
					toDetails(draft)
				);
			},
			/**
			 * Scales the chosen picture, uploads it and writes the new list.
			 * The upload comes first: a photo the document does not point at
			 * costs a few kilobytes, while a document pointing at a picture
			 * that never arrived is a broken page.
			 */
			async addPhoto(slot: PhotoSlot, file: File): Promise<void> {
				const item = store.item();
				const userId = store.userId();

				if (!item || !userId || !store.canEdit() || store.busy()) {
					return;
				}
				patchState(store, { photoBusy: slot, photoError: null });

				try {
					const photo = await photoEffect.store(
						userId,
						item.uid,
						slot,
						file
					);
					const photos = [...(item.photos ?? [])];
					const index = slot === 'front' ? 0 : 1;
					const replaced = photos[index] ?? null;

					photos[index] = photo;
					patchState(store, {
						savingKind: 'photos',
						pendingDiscard: replaced ? [replaced] : [],
					});
					collectionItemStateService.dispatchChangePhotosAction(
						item,
						photos.filter(Boolean) as CollectionItemPhoto[]
					);
				} catch (error) {
					console.error(error);
					patchState(store, {
						photoError:
							'A kép feltöltése nem sikerült. Próbáld újra.',
					});
				} finally {
					patchState(store, { photoBusy: null });
				}
			},
			/**
			 * Takes a picture off the copy. Removing the front leaves the back
			 * as the only picture, which then becomes the front — the page
			 * always shows the first of what there is.
			 */
			removePhoto(index: number): void {
				const item = store.item();

				if (!item || !store.canEdit() || store.busy()) {
					return;
				}
				const photos = [...(item.photos ?? [])];
				const [removed] = photos.splice(index, 1);

				if (!removed) {
					return;
				}
				patchState(store, {
					photoError: null,
					savingKind: 'photos',
					pendingDiscard: [removed],
				});
				collectionItemStateService.dispatchChangePhotosAction(
					item,
					photos
				);
			},
		})
	),
	withHooks({
		onInit(store) {
			store.loadCollector(of(undefined));
			store.loadCopy(of(undefined));
			store.watchSaving(of(undefined));
			// The tracklist follows the copy: it cannot be asked for before
			// the record says which album and which pressing it is.
			store.loadDetails(
				computed(() => {
					const release = store.item()?.release;

					return {
						albumUid: release?.album?.uid ?? '',
						releaseUid: release?.uid ?? null,
					};
				})
			);
		},
	})
);
