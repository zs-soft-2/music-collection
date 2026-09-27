import { exhaustMap, filter, pipe, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ProposalService } from '../../../data/proposal';
import {
	RequestEffect,
	formatRequestValue,
	requestFieldLabelKey,
	toReferenceKind,
	toRequestChanges,
	toRequestSnapshot,
} from '../../../data/request';

/** One field of the proposal, as the collector is asked about it. */
export interface ProposedFieldRow {
	field: string;
	labelKey: string;
	before: string;
	after: string;
}

interface ProposeArtistReviewState {
	/** What the collector typed in support of each field. */
	references: Record<string, string>;
	note: string;
	submitting: boolean;
	/** The dictionary key of what went wrong, if anything did. */
	failed: string | null;
	sent: boolean;
}

const initialState: ProposeArtistReviewState = {
	references: {},
	note: '',
	submitting: false,
	failed: null,
	sent: false,
};

/**
 * The second half of proposing a change: what backs it.
 *
 * It knows nothing about artists or albums — the proposal carries which
 * entity it is about and where it sits, so this page is the same page for
 * every one of them.
 *
 * A collector asking the catalog to change its mind is asking on some
 * grounds, and the grounds belong to the field, not to the request — an admin
 * decides one field at a time, and a single note at the bottom would leave
 * most of those decisions unsupported. So every changed field is asked about
 * separately, and nothing is sent until each has an answer.
 */
export const ProposeReviewStore = signalStore(
	withState(initialState),
	withComputed((store, proposals = inject(ProposalService)) => {
		const changes = computed(() => {
			const proposal = proposals.proposal();

			return proposal
				? toRequestChanges(
						toRequestSnapshot(proposal.before),
						toRequestSnapshot(proposal.after)
					)
				: [];
		});

		return {
			changes,
			rows: computed<ProposedFieldRow[]>(() =>
				changes().map((change) => ({
					field: change.field,
					labelKey: requestFieldLabelKey(change.field),
					before: formatRequestValue(change.before),
					after: formatRequestValue(change.after),
				}))
			),
			/** Nothing was changed, so there is nothing to ask for. */
			isEmpty: computed(() => !proposals.proposal() || !changes().length),
			/** Every changed field has something behind it. */
			canSubmit: computed(() =>
				changes().every((change) =>
					store.references()[change.field]?.trim()
				)
			),
		};
	}),
	withMethods(
		(
			store,
			proposals = inject(ProposalService),
			requestEffect = inject(RequestEffect)
		) => ({
			setReference(input: { field: string; value: string }): void {
				patchState(store, {
					references: {
						...store.references(),
						[input.field]: input.value,
					},
					failed: null,
				});
			},
			setNote(note: string): void {
				patchState(store, { note });
			},
			/** Gives the proposal up; the catalog is left as it was. */
			discard(): void {
				proposals.clear();
				patchState(store, initialState);
			},
			submit: rxMethod<void>(
				pipe(
					// The button is disabled without them and the server
					// refuses them anyway; this is the middle of the three,
					// and the one that keeps a stray call from ever leaving.
					filter(() => !store.submitting() && store.canSubmit()),
					tap(() =>
						patchState(store, { submitting: true, failed: null })
					),
					exhaustMap(() => {
						const proposal = proposals.proposal();

						if (!proposal) {
							patchState(store, {
								submitting: false,
								failed: 'page.propose.nothing-to-send',
							});

							return [];
						}

						const references = Object.fromEntries(
							Object.entries(store.references())
								.filter(([, value]) => value.trim())
								.map(([field, value]) => [
									field,
									{
										kind: toReferenceKind(value),
										value: value.trim(),
									},
								])
						);

						return requestEffect
							.submitUpdate$({
								featureKey: proposal.featureKey,
								entityType: proposal.entityType,
								path: proposal.path,
								before: proposal.before,
								after: proposal.after,
								references,
								baseUpdatedAt: proposal.baseUpdatedAt,
								note: store.note().trim() || null,
							})
							.pipe(
								tapResponse({
									next: () => {
										proposals.clear();
										patchState(store, {
											submitting: false,
											sent: true,
										});
									},
									error: (error) => {
										console.error(
											'A change was not proposed',
											error
										);
										patchState(store, {
											submitting: false,
											failed: 'page.propose.could-not-send',
										});
									},
								})
							);
					})
				)
			),
		})
	)
);
