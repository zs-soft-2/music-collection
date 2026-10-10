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
	CollectionItemPhoto,
	CollectionItemSerial,
	CollectionItemStateService,
	ContributionEntity,
	ReleaseEntity,
	ReleaseStateService,
	TrackEntity,
	toCollectionItemSerial,
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

import { withCopyDisposal } from '../../shared/copy-disposal/copy-disposal.feature';
import { DisposalDraft } from '../../shared/music-ui';
import { AlbumDetailsEffect } from '../../data/album-details';
import { CopyPhotoEffect } from '../../data/copy-photo';
import { CopySerialEffect, CopySerialTakenError } from '../../data/copy-serial';
import { AlbumRating, RatingEffect, ratingFor } from '../../data/rating';
import { toAlbumProfile } from '../album/album.mapper';
import {
	toCopyCondition,
	toCopyPhotos,
	toCopyPressing,
	toCopyProvenance,
	toCopySerial,
	toCopyTracks,
	toPressingOptions,
	toRemovedCopy,
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
	/** The copy's number on a numbered edition, as typed. */
	serialNumber: string;
	/** How many the edition ran to, as typed. */
	serialTotal: string;
	story: string;
}

/** A number the registry holds while a write decides whether it should. */
interface PendingSerial {
	releaseId: string;
	number: number;
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
	/** The collector's own verdicts; empty while signed out. */
	ratings: AlbumRating[];
	/** A verdict is on its way; the stars wait rather than lie. */
	ratingWriting: boolean;
	editing: boolean;
	draft: CopyDraft;
	saving: boolean;
	/** Which write is in flight — they share one flag in the store. */
	savingKind: 'details' | 'photos' | 'release' | null;
	saveError: string | null;
	/**
	 * The catalog's releases, asked for only once the collector opens the
	 * list of them: a page read to look at a record should not pay for the
	 * catalog nobody asked to see.
	 */
	catalogReleases: ReleaseEntity[];
	catalogReleasesLoading: boolean;
	/** The releases of this album are open to be picked from. */
	choosingRelease: boolean;
	/** Which release is picked in the open list, before it is written. */
	pickedReleaseId: string | null;
	/** Why the move to another release did not go through. */
	releaseError: string | null;
	/** Every release the collector already has a copy of. */
	ownedReleaseIds: string[];
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
	/**
	 * Where each picture can be shown from, by Storage path. The document
	 * holds the path alone — the URL carries a token that would open the file
	 * to anyone holding it — so the page asks Storage for it, and Storage
	 * answers the owner only.
	 */
	photoUrls: Record<string, string>;
	/**
	 * The number the copy wore before this save. Given back to the registry
	 * once the write goes through — until then the stored copy still wears
	 * it, and a number released early is one a stranger could take while our
	 * own write is still in flight.
	 */
	previousSerial: PendingSerial | null;
	/**
	 * The number taken for this save. Given back if the write is refused, so
	 * a save that failed leaves no number locked away behind a copy that
	 * never got it.
	 */
	claimedSerial: PendingSerial | null;
	/**
	 * A number is being taken from the registry. That is a round trip of its
	 * own, before the write the rest of the page waits on — so the form has
	 * to be held shut over it too, or a second click would start the save
	 * again while the first is still asking.
	 */
	claiming: boolean;
}

const EMPTY_DRAFT: CopyDraft = {
	description: '',
	purchaseDate: '',
	purchasePlace: '',
	purchasePrice: '',
	purchaseCurrency: '',
	mediaGrade: null,
	sleeveGrade: null,
	serialNumber: '',
	serialTotal: '',
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
	ratings: [],
	ratingWriting: false,
	editing: false,
	draft: EMPTY_DRAFT,
	saving: false,
	savingKind: null,
	saveError: null,
	catalogReleases: [],
	catalogReleasesLoading: false,
	choosingRelease: false,
	pickedReleaseId: null,
	releaseError: null,
	ownedReleaseIds: [],
	photoBusy: null,
	photoError: null,
	pendingDiscard: [],
	photoUrls: {},
	previousSerial: null,
	claimedSerial: null,
	claiming: false,
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
		serialNumber: item.serial ? String(item.serial.number) : '',
		serialTotal:
			item.serial?.total != null ? String(item.serial.total) : '',
		story: item.story ?? '',
	};
}

/** The number as the record keeps it. */
function toSerial(draft: CopyDraft): CollectionItemSerial | null {
	return toCollectionItemSerial(draft.serialNumber, draft.serialTotal);
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
		serial: toSerial(draft),
		story: story || null,
	};
}

/** What to tell the collector when the number is already spoken for. */
function toSerialError(error: unknown): string {
	if (error instanceof CopySerialTakenError) {
		return error.conflict === 'mine'
			? 'You have already registered this number on another copy.'
			: 'Another collector has registered this copy. If it is the one in your hands, check the number on it.';
	}
	console.error(error);

	return 'The number could not be checked just now. Try again.';
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
	withCopyDisposal(),
	withComputed((store) => ({
		/** The album this copy is a recording of, as the catalog holds it. */
		album: computed(() => {
			const album = store.item()?.release?.album;

			return album ? toAlbumProfile(album) : null;
		}),
		/**
		 * What the collector thinks of the music — of the album, not of this
		 * copy of it. The grades above say what the plastic is like; this
		 * says whether the record was worth pressing.
		 */
		myRating: computed(() =>
			ratingFor(
				store.ratings(),
				store.item()?.release?.album?.uid ?? null
			)
		),
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
		/** "No. 123 of 500", where this copy was one of a numbered edition. */
		serial: computed(() => {
			const item = store.item();

			return item ? toCopySerial(item) : null;
		}),
		photos: computed(() =>
			toCopyPhotos(store.item()?.photos, store.photoUrls())
		),
		story: computed(() => store.item()?.story ?? null),
		/** The copy left the collection; the page reads as history. */
		disposal: computed(() => store.item()?.disposal ?? null),
		tracklist: computed(() =>
			toCopyTracks(store.tracks(), store.item()?.release?.uid ?? null)
		),
		/**
		 * The releases of this album, with the copy's own marked. This is
		 * what a collector reads to tell which pressing they filed the record
		 * under — a question most albums answer with one line today, and
		 * will answer with a dozen once the catalog knows the pressings.
		 */
		pressingOptions: computed(() =>
			toPressingOptions(
				store.catalogReleases(),
				store.item()?.release?.album?.uid ?? '',
				store.item()?.release?.uid ?? null,
				new Set(store.ownedReleaseIds())
			)
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
			() =>
				store.claiming() ||
				(store.saving() && store.savingKind() === 'details')
		),
		/** A second picture can still be added. */
		canAddPhoto: computed(
			() =>
				store.canManageCopies() &&
				store.photos().length < COLLECTION_ITEM_PHOTO_LIMIT
		),
		/**
		 * The copy can be let go of: it is the collector's to change, and it
		 * is still in the collection. One already gone is taken back on the
		 * album page, where the collector can see what else they own of it.
		 */
		canRemove: computed(
			() => store.canManageCopies() && !!store.item() && !store.disposal()
		),
		/**
		 * The copy can be moved onto another release of the same album: it is
		 * the collector's to change, and it is still in the collection. One
		 * that has left it is history, and history is not refiled.
		 */
		canChangeRelease: computed(
			() => store.canManageCopies() && !!store.item() && !store.disposal()
		),
		/** The copy is being moved onto another release. */
		changingRelease: computed(
			() =>
				store.claiming() ||
				(store.saving() && store.savingKind() === 'release')
		),
		/** The copy as the removal dialog names it, once it is open. */
		removingCopy: computed(() => {
			const item = store.item();

			return item && store.removingCopyId() === item.uid
				? toRemovedCopy(item)
				: null;
		}),
	})),
	withMethods(
		(
			store,
			route = inject(ActivatedRoute),
			collectionItemStateService = inject(CollectionItemStateService),
			releaseStateService = inject(ReleaseStateService),
			authenticationStateService = inject(AuthenticationStateService),
			albumDetailsEffect = inject(AlbumDetailsEffect),
			photoEffect = inject(CopyPhotoEffect),
			serialEffect = inject(CopySerialEffect),
			ratingEffect = inject(RatingEffect)
		) => ({
			/** The collector's own verdicts; follows sign-in. */
			loadRatings: rxMethod<void>(
				pipe(
					switchMap(() => ratingEffect.list$()),
					tapResponse({
						next: (ratings: AlbumRating[]) =>
							patchState(store, { ratings }),
						error: (error) => console.error(error),
					})
				)
			),
			/**
			 * Gives the record its stars, from the copy's own page: the
			 * collector is standing here with the sleeve in their hand, which
			 * is a better moment to ask than any page about a catalog.
			 */
			async rate(stars: number): Promise<void> {
				const album = store.item()?.release?.album;

				if (!album?.uid || store.ratingWriting()) {
					return;
				}

				patchState(store, { ratingWriting: true });

				try {
					await ratingEffect.rate(
						{
							albumId: album.uid,
							albumTitle: album.name,
							artistName: album.artist?.name ?? null,
							artistId: album.artist?.uid ?? null,
						},
						{ stars, note: store.myRating()?.note ?? null }
					);
				} catch (error) {
					console.error('Verdict not kept', error);
				} finally {
					patchState(store, { ratingWriting: false });
				}
			},
			/** Leaves the record unjudged again rather than poor. */
			async clearRating(): Promise<void> {
				const albumId = store.item()?.release?.album?.uid;

				if (!albumId || store.ratingWriting()) {
					return;
				}

				patchState(store, { ratingWriting: true });

				try {
					await ratingEffect.clear(albumId);
				} catch (error) {
					console.error('Verdict not taken back', error);
				} finally {
					patchState(store, { ratingWriting: false });
				}
			},
			/** Opens the removal dialog for the copy this page is about. */
			askRemoval(): void {
				const item = store.item();

				if (item && store.canRemove()) {
					store.openRemoval(item.uid);
				}
			},
			/**
			 * Marks the copy sold, traded… The page stays open on it: a copy
			 * gone from the collection is still the collector's to look back
			 * on, and now says when it left and why.
			 */
			removeCopy(draft: DisposalDraft): void {
				const item = store.item();

				if (item && store.canRemove()) {
					store.disposeCopy(item, draft);
				}
			},
			/**
			 * Who is signed in. Whether they may change their copies is the
			 * disposal feature's to follow (`watchCopyPermission`), the same
			 * question on every page that shows a copy.
			 */
			loadCollector: rxMethod<void>(
				pipe(
					switchMap(() =>
						authenticationStateService.selectAuthenticatedUser$()
					),
					tap((user) =>
						patchState(store, { userId: user?.uid ?? null })
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
							map(([owned, gone]) => ({
								item: [...owned, ...gone].find(
									(item) => item.uid === itemId
								),
								// Which releases a copy of this
								// collector's already stands under:
								// the list offers no move that would
								// file two copies under one pressing,
								// the way the album page adds no
								// second copy of one.
								ownedReleaseIds: owned.flatMap((copy) =>
									copy.release?.uid ? [copy.release.uid] : []
								),
							})),
							tapResponse({
								next: ({ item, ownedReleaseIds }) =>
									patchState(store, {
										item: item ?? null,
										itemLoading: false,
										notFound: !item,
										ownedReleaseIds,
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
			/**
			 * The catalog's releases, so the album's pressings can be listed
			 * next to the copy's own. Asked for only when the collector opens
			 * the list: a visit to look at a record should not pay for a
			 * catalog nobody asked to see.
			 */
			loadCatalogReleases: rxMethod<void>(
				pipe(
					switchMap(() =>
						releaseStateService.selectEntities$().pipe(
							tap((releases) => {
								if (!releases?.length) {
									releaseStateService.dispatchListEntitiesAction();
								}
							}),
							filter(
								(releases: ReleaseEntity[]) =>
									releases?.length > 0
							)
						)
					),
					tapResponse({
						next: (catalogReleases: ReleaseEntity[]) =>
							patchState(store, {
								catalogReleases,
								catalogReleasesLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								catalogReleasesLoading: false,
								releaseError:
									'The album\u2019s releases could not be read just now.',
							});
						},
					})
				)
			),
			/**
			 * Asks Storage where the copy's pictures can be shown from.
			 *
			 * The document names the files and nothing more, so the URLs are
			 * asked for here, once per set of paths — the copy arrives again
			 * on every change to the collection, and a picture that has not
			 * moved should not be asked about twice.
			 */
			resolvePhotos: rxMethod<CollectionItemPhoto[]>(
				pipe(
					distinctUntilChanged(
						(before, after) =>
							before.length === after.length &&
							before.every(
								(photo, index) =>
									photo.path === after[index].path
							)
					),
					switchMap((photos) => photoEffect.urls(photos)),
					tap((photoUrls) => patchState(store, { photoUrls }))
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
							const previous = store.previousSerial();
							const claimed = store.claimedSerial();

							patchState(store, {
								saveError: error,
								editing: !!error,
								savingKind: null,
								previousSerial: null,
								claimedSerial: null,
							});
							// The write decides which of the two numbers the
							// registry should still be holding: the one the
							// copy now wears, or the one it wore before.
							const stale = error ? claimed : previous;

							if (stale) {
								void serialEffect.release(
									stale.releaseId,
									stale.number
								);
							}
							return;
						}
						if (kind === 'release') {
							const previous = store.previousSerial();
							const claimed = store.claimedSerial();

							patchState(store, {
								releaseError: error,
								// A refused move leaves the list open on what
								// was picked, so the reason stands next to it.
								choosingRelease: !!error,
								savingKind: null,
								previousSerial: null,
								claimedSerial: null,
							});

							if (!error) {
								patchState(store, { pickedReleaseId: null });
							}
							// The number travelled with the copy, so one of
							// the two pressings is holding it for nothing:
							// the new one if the write was refused, the old
							// one if it went through.
							const stale = error ? claimed : previous;

							if (stale) {
								void serialEffect.release(
									stale.releaseId,
									stale.number
								);
							}
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

				if (!item || !store.canManageCopies()) {
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
			/**
			 * Writes what the collector tells about the copy.
			 *
			 * A number is taken from the registry before the copy is written
			 * and given back after it — that order is what keeps the two
			 * honest. Taking first means a number someone else holds stops
			 * the save while nothing has changed yet; giving back after means
			 * the stored copy is never left wearing a number the registry has
			 * already handed on.
			 */
			async save(draft: CopyDraft): Promise<void> {
				const item = store.item();
				const userId = store.userId();

				if (
					!item ||
					!userId ||
					!store.canManageCopies() ||
					store.saving() ||
					store.claiming()
				) {
					return;
				}
				const releaseId = item.release?.uid ?? null;
				const next = toSerial(draft);
				const current = item.serial ?? null;
				const moved =
					(next?.number ?? null) !== (current?.number ?? null);

				// A number belongs to a pressing; without one there is nothing
				// it could be the 123rd of.
				if (next && !releaseId) {
					patchState(store, {
						draft,
						saveError:
							'This copy is not tied to a pressing, so its number cannot be registered.',
					});
					return;
				}
				patchState(store, { draft, saveError: null });

				if (moved && next && releaseId) {
					patchState(store, { claiming: true });
					try {
						await serialEffect.hold(
							releaseId,
							next,
							userId,
							item.uid
						);
					} catch (error) {
						patchState(store, {
							claiming: false,
							saveError: toSerialError(error),
						});
						return;
					}
					patchState(store, { claiming: false });
				}
				patchState(store, {
					savingKind: 'details',
					claimedSerial:
						moved && next && releaseId
							? { releaseId, number: next.number }
							: null,
					previousSerial:
						moved && current && releaseId
							? { releaseId, number: current.number }
							: null,
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

				if (
					!item ||
					!userId ||
					!store.canManageCopies() ||
					store.busy()
				) {
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

				if (!item || !store.canManageCopies() || store.busy()) {
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
	/**
	 * Which release the copy is filed under.
	 *
	 * A block of its own because it reaches for `loadCatalogReleases` above
	 * it: the releases are asked for when the collector opens the list, not
	 * when the page loads.
	 */
	withMethods(
		(
			store,
			collectionItemStateService = inject(CollectionItemStateService),
			serialEffect = inject(CopySerialEffect)
		) => {
			let catalogRequested = false;

			return {
				/** Opens the album's releases to be read through. */
				chooseRelease(): void {
					if (!store.canChangeRelease()) {
						return;
					}
					if (!catalogRequested) {
						catalogRequested = true;
						patchState(store, { catalogReleasesLoading: true });
						store.loadCatalogReleases(of(undefined));
					}
					patchState(store, {
						choosingRelease: true,
						pickedReleaseId: null,
						releaseError: null,
					});
				},
				closeReleaseChoice(): void {
					patchState(store, {
						choosingRelease: false,
						pickedReleaseId: null,
						releaseError: null,
					});
				},
				/**
				 * Points at a release without moving the copy onto it. The
				 * move is a second click on purpose: the list is read far
				 * more often than it is changed, and a pressing picked by
				 * accident would take the copy's number with it.
				 */
				pickRelease(releaseId: string | null): void {
					patchState(store, {
						pickedReleaseId: releaseId,
						releaseError: null,
					});
				},
				/**
				 * Moves the copy onto another release of the same album —
				 * the collector found the pressing they actually own, or
				 * filed the record on its format alone until now.
				 *
				 * Everything the page keeps about the copy stays: the price,
				 * the grades, the story, the photographs and the shelf place
				 * are of this very record whichever release the catalog says
				 * it came out on.
				 *
				 * A numbered copy's number travels with it, and is taken on
				 * the new pressing before the copy is written — the same
				 * order the form saves in, and for the same reason: a number
				 * another collector holds stops the move while nothing has
				 * changed yet. The one left behind is given back once the
				 * write has had its say (see `watchSaving`).
				 */
				async changeRelease(releaseId: string): Promise<void> {
					const item = store.item();
					const userId = store.userId();

					if (
						!item ||
						!userId ||
						!store.canChangeRelease() ||
						store.saving() ||
						store.claiming()
					) {
						return;
					}
					const release = store
						.catalogReleases()
						.find((candidate) => candidate.uid === releaseId);

					if (!release) {
						patchState(store, {
							releaseError:
								'That release is not in the catalog any more.',
						});
						return;
					}
					if (release.uid === item.release?.uid) {
						patchState(store, {
							choosingRelease: false,
							pickedReleaseId: null,
						});
						return;
					}
					if (store.ownedReleaseIds().includes(release.uid)) {
						patchState(store, {
							releaseError:
								'Another of your copies is already filed under that release.',
						});
						return;
					}
					const serial = item.serial ?? null;
					const previousReleaseId = item.release?.uid ?? null;

					patchState(store, { releaseError: null });

					if (serial) {
						patchState(store, { claiming: true });
						try {
							await serialEffect.hold(
								release.uid,
								serial,
								userId,
								item.uid
							);
						} catch (error) {
							patchState(store, {
								claiming: false,
								releaseError: toSerialError(error),
							});
							return;
						}
						patchState(store, { claiming: false });
					}
					patchState(store, {
						savingKind: 'release',
						claimedSerial: serial
							? { releaseId: release.uid, number: serial.number }
							: null,
						previousSerial:
							serial && previousReleaseId
								? {
										releaseId: previousReleaseId,
										number: serial.number,
									}
								: null,
					});
					collectionItemStateService.dispatchChangeReleaseAction(
						item,
						release
					);
				},
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadCollector(of(undefined));
			store.loadRatings(of(undefined));
			store.watchCopyPermission(of(undefined));
			store.loadCopy(of(undefined));
			store.watchSaving(of(undefined));
			store.watchDisposing(of(undefined));
			// The pictures follow the copy too: the document names the
			// files, Storage says where they can be read from.
			store.resolvePhotos(computed(() => store.item()?.photos ?? []));
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
