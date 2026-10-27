import { combineLatest, pairwise, pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import {
	AuthenticationStateService,
	COLLECTION_ITEM_DISPOSAL_REASONS,
	CollectionItemEntity,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	RoleNames,
} from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
import {
	patchState,
	signalStoreFeature,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { NgxPermissionsService } from 'ngx-permissions';

import { CopySerialEffect } from '../../data/copy-serial';
import { DisposalDraft } from '../music-ui/copy-removal/copy-removal.model';

const DISPOSAL_NOTE_MAX_LENGTH = 500;

/**
 * The number of a copy changing hands, and which way it is going. Acted on
 * once the write is through: a record that has left the collection gives its
 * number back to the registry, so whoever holds the record can register it,
 * and one taken back asks for the number again.
 */
interface SerialHandover {
	releaseId: string;
	number: number;
	itemId: string;
	userId: string;
	/** Taking the number back, rather than giving it up. */
	retake: boolean;
}

interface CopyDisposalState {
	/** The copy the removal dialog is open for. */
	removingCopyId: string | null;
	disposing: boolean;
	disposeError: string | null;
	serialHandover: SerialHandover | null;
	/** The collector may let their copies go, and take them back. */
	canManageCopies: boolean;
}

const initialState: CopyDisposalState = {
	removingCopyId: null,
	disposing: false,
	disposeError: null,
	serialHandover: null,
	canManageCopies: false,
};

/** A removal the rules accept: a known reason, a past date, a short note. */
function isValidDisposal(draft: DisposalDraft): boolean {
	return (
		COLLECTION_ITEM_DISPOSAL_REASONS.includes(draft.reason) &&
		Number.isFinite(draft.date) &&
		draft.date <= Date.now() &&
		(draft.note?.length ?? 0) <= DISPOSAL_NOTE_MAX_LENGTH
	);
}

/**
 * What the registry has to be told once a copy changes hands, or null where
 * the copy carries no number and the registry has nothing to do with it —
 * which is nearly every record.
 */
function toSerialHandover(
	item: CollectionItemEntity,
	retake: boolean
): SerialHandover | null {
	const releaseId = item.release?.uid ?? null;

	return item.serial && releaseId
		? {
				releaseId,
				number: item.serial.number,
				itemId: item.uid,
				userId: item.userId,
				retake,
			}
		: null;
}

/**
 * Letting a copy go, and taking it back, for every page that shows one.
 *
 * A collector parts with a record where they are looking at it — on the
 * shelf, on the copy's own page, on the album — so the dialog, the flag it
 * waits on, the right to touch a copy at all and the numbered-edition
 * handover that follows the write belong to none of those pages in
 * particular. Each page still decides *which* copy is meant; this only
 * carries out the removal once it has been asked for.
 */
export function withCopyDisposal() {
	return signalStoreFeature(
		withState(initialState),
		withMethods(
			(
				store,
				collectionItemStateService = inject(CollectionItemStateService),
				authenticationStateService = inject(AuthenticationStateService),
				permissionsService = inject(NgxPermissionsService),
				text = inject(TextService),
				serialEffect = inject(CopySerialEffect)
			) => ({
				/**
				 * Whether the collector may change their copies: a session,
				 * and the right to write one. The roles arrive after the page
				 * does, so this is followed rather than read once — but a
				 * page must never offer the write on the strength of roles
				 * left behind by a collector who has since signed out.
				 */
				watchCopyPermission: rxMethod<void>(
					pipe(
						switchMap(() =>
							combineLatest([
								authenticationStateService.selectAuthenticatedUser$(),
								permissionsService.permissions$,
							])
						),
						tap(([user, permissions]) =>
							patchState(store, {
								canManageCopies:
									!!user?.uid &&
									(CollectionItemPermissionsService.updateCollectionItemEntity in
										permissions ||
										RoleNames.ADMIN in permissions),
							})
						)
					)
				),
				/** Follows a removal or restore; the dialog closes once saved. */
				watchDisposing: rxMethod<void>(
					pipe(
						switchMap(() =>
							collectionItemStateService.selectDisposalStatus$()
						),
						// Both halves out of one state: a refused write turns
						// the flag off and sets the error in the same step, and
						// reading them apart would show a moment in between
						// that looks exactly like a write that went through.
						pairwise(),
						tap(([was, { disposing, error }]) => {
							patchState(store, { disposing });
							if (!was.disposing || disposing) {
								return;
							}
							const handover = store.serialHandover();

							patchState(store, {
								disposeError: error,
								removingCopyId: error
									? store.removingCopyId()
									: null,
								serialHandover: null,
							});
							if (error || !handover) {
								return;
							}
							// The copy is written; now the registry follows it.
							if (!handover.retake) {
								void serialEffect.release(
									handover.releaseId,
									handover.number
								);
								return;
							}
							serialEffect
								.hold(
									handover.releaseId,
									{ number: handover.number, total: null },
									handover.userId,
									handover.itemId
								)
								.catch(() =>
									// Someone registered it while the record was
									// out of the collection. The copy is back and
									// still shows the number it wore, but it no
									// longer holds it — worth saying, because the
									// next edit to that number will be refused.
									patchState(store, {
										disposeError: text.translator()(
											'ui.copyRemoval.numberTakenMeanwhile'
										),
									})
								);
						})
					)
				),
				openRemoval(copyId: string): void {
					patchState(store, {
						removingCopyId: copyId,
						disposeError: null,
					});
				},
				closeRemoval(): void {
					patchState(store, { removingCopyId: null });
				},
				/**
				 * Marks the copy sold, traded… It stays in the history. The
				 * caller has already decided that this copy is the collector's
				 * to let go of.
				 */
				disposeCopy(
					item: CollectionItemEntity,
					draft: DisposalDraft
				): void {
					if (store.disposing() || !isValidDisposal(draft)) {
						return;
					}

					patchState(store, {
						disposeError: null,
						serialHandover: toSerialHandover(item, false),
					});
					collectionItemStateService.dispatchDisposeEntityAction(
						item,
						{
							reason: draft.reason,
							date: draft.date,
							note: draft.note?.trim() || null,
						}
					);
				},
				/** Takes a copy gone from the collection back into it. */
				restoreDisposedCopy(item: CollectionItemEntity): void {
					if (store.disposing()) {
						return;
					}

					patchState(store, {
						serialHandover: toSerialHandover(item, true),
					});
					collectionItemStateService.dispatchRestoreEntityAction(
						item
					);
				},
			})
		)
	);
}
