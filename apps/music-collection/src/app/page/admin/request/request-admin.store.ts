import { exhaustMap, filter, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	EntityRequest,
	EntityRequestVerdictKind,
	EntityResponse,
	User,
} from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
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

import { RequestEffect } from '../../../data/request';
import { StatusFilter, toRequestRows } from './request-admin.mapper';

/** What the admin has decided on one field, before it is sent. */
export interface VerdictDraft {
	kind: EntityRequestVerdictKind;
	reason: string;
}

/** The decisions taken on one request so far, by field. */
export type RequestDraft = Record<string, VerdictDraft>;

interface RequestAdminState {
	requests: EntityRequest[];
	responses: EntityResponse[];
	users: User[];
	loading: boolean;
	statusFilter: StatusFilter;
	/** The request being decided right now. */
	busyId: string | null;
	/** Failed decisions by request id. */
	errors: Record<string, string>;
	/** What the admin has clicked so far, by request id. */
	drafts: Record<string, RequestDraft>;
	/** A word about the request as a whole, by request id. */
	adminNotes: Record<string, string>;
}

const initialState: RequestAdminState = {
	requests: [],
	responses: [],
	users: [],
	loading: true,
	statusFilter: 'pending',
	busyId: null,
	errors: {},
	drafts: {},
	adminNotes: {},
};

const ERRORS: Record<string, string> = {
	'not-found': 'ui.requestAdmin.error-not-found',
	'failed-precondition': 'ui.requestAdmin.error-moved-on',
	'invalid-argument': 'ui.requestAdmin.error-invalid',
	'permission-denied': 'ui.requestAdmin.error-not-allowed',
};

function errorKeyOf(error: unknown): string {
	const code = ((error as { code?: string })?.code ?? '').replace(
		/^functions\//,
		''
	);

	return ERRORS[code] ?? 'ui.requestAdmin.error-unknown';
}

/**
 * Admin: the collectors' requests, decided field by field.
 *
 * The half-made decision lives here rather than in the row that shows it: an
 * admin works through a request field by field, and a component torn down by
 * a filter click — or by the list arriving again from Firestore — would take
 * the unsent decision with it.
 */
export const RequestAdminStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => {
		const rows = computed(() =>
			toRequestRows(
				store.requests(),
				store.responses(),
				store.users(),
				text.translator()
			)
		);

		return {
			rows: computed(() => {
				const status = store.statusFilter();

				return status === 'all'
					? rows()
					: rows().filter((row) => row.status === status);
			}),
			counts: computed(() => {
				const counts = {
					pending: 0,
					approved: 0,
					'partially-approved': 0,
					rejected: 0,
					all: 0,
				};

				for (const request of store.requests()) {
					counts[request.status] += 1;
					counts.all += 1;
				}

				return counts;
			}),
		};
	}),
	withMethods((store, requestEffect = inject(RequestEffect)) => {
		const setError = (id: string, error: string | null) => {
			const errors = { ...store.errors() };

			if (error) {
				errors[id] = error;
			} else {
				delete errors[id];
			}

			patchState(store, { errors });
		};
		const patchDraft = (
			requestId: string,
			field: string,
			verdict: Partial<VerdictDraft>
		) => {
			const draft = store.drafts()[requestId] ?? {};
			const held = draft[field] ?? { kind: 'accepted', reason: '' };

			patchState(store, {
				drafts: {
					...store.drafts(),
					[requestId]: { ...draft, [field]: { ...held, ...verdict } },
				},
			});
		};

		return {
			load: rxMethod<void>(
				pipe(
					switchMap(() => requestEffect.listAll$()),
					tapResponse({
						next: (requests) =>
							patchState(store, { requests, loading: false }),
						error: (error) => {
							console.error(error);
							patchState(store, { loading: false });
						},
					})
				)
			),
			loadResponses: rxMethod<void>(
				pipe(
					switchMap(() => requestEffect.listAllResponses$()),
					tapResponse({
						next: (responses) => patchState(store, { responses }),
						error: (error) => console.error(error),
					})
				)
			),
			loadUsers: rxMethod<void>(
				pipe(
					switchMap(() => requestEffect.listUsers$()),
					tapResponse({
						next: (users) => patchState(store, { users }),
						error: (error) => console.error(error),
					})
				)
			),
			setStatusFilter(statusFilter: StatusFilter): void {
				patchState(store, { statusFilter });
			},
			/** Takes the field in, or turns it down — the reason comes next. */
			setVerdict(input: {
				requestId: string;
				field: string;
				kind: EntityRequestVerdictKind;
			}): void {
				patchDraft(input.requestId, input.field, { kind: input.kind });
			},
			setReason(input: {
				requestId: string;
				field: string;
				reason: string;
			}): void {
				patchDraft(input.requestId, input.field, {
					reason: input.reason,
				});
			},
			setAdminNote(input: { requestId: string; note: string }): void {
				patchState(store, {
					adminNotes: {
						...store.adminNotes(),
						[input.requestId]: input.note,
					},
				});
			},
			/**
			 * Sends the decision. Whether it may be sent at all is the row's
			 * question — every field answered, every refusal reasoned — and
			 * the server asks it again either way.
			 */
			decide: rxMethod<string>(
				pipe(
					filter(() => !store.busyId()),
					tap((requestId) => {
						patchState(store, { busyId: requestId });
						setError(requestId, null);
					}),
					exhaustMap((requestId) => {
						const draft = store.drafts()[requestId] ?? {};

						return requestEffect
							.decide$({
								requestId,
								verdicts: Object.entries(draft).map(
									([field, verdict]) => ({
										field,
										kind: verdict.kind,
										reason: verdict.reason.trim() || null,
									})
								),
								adminNote:
									store.adminNotes()[requestId]?.trim() ||
									null,
							})
							.pipe(
								tapResponse({
									next: () => {
										const drafts = { ...store.drafts() };

										delete drafts[requestId];
										patchState(store, {
											busyId: null,
											drafts,
										});
									},
									error: (error) => {
										console.error(error);
										patchState(store, { busyId: null });
										setError(requestId, errorKeyOf(error));
									},
								})
							);
					})
				)
			),
		};
	}),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadResponses(of(undefined));
			store.loadUsers(of(undefined));
		},
	})
);
