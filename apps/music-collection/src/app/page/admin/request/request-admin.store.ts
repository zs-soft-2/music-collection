import { exhaustMap, filter, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	EntityRequest,
	EntityRequestVerdictKind,
	EntityResponse,
	ReleaseEntity,
	ReleaseRequest,
	ReleaseStateService,
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

import { ReleaseRequestEffect } from '../../../data/release-request';
import { RequestEffect } from '../../../data/request';
import { toReleaseRequestRows } from './release-request.mapper';
import { StatusFilter, toRequestRows } from './request-admin.mapper';
import { KindCounts, KindFilter, toRequestFeed } from './request-feed';

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
	/** The other kind: asking the catalog to take in a pressing. */
	releaseRequests: ReleaseRequest[];
	users: User[];
	/** The catalog releases, to approve a release request with one of them. */
	releases: ReleaseEntity[];
	loadingRequests: boolean;
	loadingReleaseRequests: boolean;
	statusFilter: StatusFilter;
	kindFilter: KindFilter;
	adminUid: string | null;
	/** The request being decided right now. */
	busyId: string | null;
	/** Failed decisions by request id, as translation keys. */
	errors: Record<string, string>;
	/** What the admin has clicked so far, by request id. */
	drafts: Record<string, RequestDraft>;
	/** A word about the request as a whole, by request id. */
	adminNotes: Record<string, string>;
}

const initialState: RequestAdminState = {
	requests: [],
	responses: [],
	releaseRequests: [],
	users: [],
	releases: [],
	loadingRequests: true,
	loadingReleaseRequests: true,
	statusFilter: 'pending',
	kindFilter: 'all',
	adminUid: null,
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

const RELEASE_ERRORS: Record<string, string> = {
	'not-found': 'ui.releaseRequestAdmin.error-not-found',
	'failed-precondition': 'ui.releaseRequestAdmin.error-moved-on',
	'permission-denied': 'ui.releaseRequestAdmin.error-not-allowed',
	unavailable: 'ui.releaseRequestAdmin.error-discogs-unreachable',
	'resource-exhausted': 'ui.releaseRequestAdmin.error-discogs-busy',
};

function codeOf(error: unknown): string {
	return ((error as { code?: string })?.code ?? '').replace(
		/^functions\//,
		''
	);
}

function errorKeyOf(error: unknown): string {
	return ERRORS[codeOf(error)] ?? 'ui.requestAdmin.error-unknown';
}

function releaseErrorKeyOf(error: unknown): string {
	return (
		RELEASE_ERRORS[codeOf(error)] ?? 'ui.releaseRequestAdmin.error-unknown'
	);
}

/**
 * Admin: everything the collectors have asked of the catalog, in one list.
 *
 * Two things are asked here, and they are answered differently: a catalog
 * request is decided field by field, a release request by importing the
 * pressing or linking one the catalog already has. That difference is real
 * and stays in the cards, but which of the two a collector happened to send
 * is no reason to make an admin look in two places for their work — so both
 * are read here, newest first, with the kind as a filter.
 *
 * The half-made decision lives here rather than in the card that shows it: an
 * admin works through a request field by field, and a component torn down by
 * a filter click — or by the list arriving again from Firestore — would take
 * the unsent decision with it.
 */
export const RequestAdminStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => {
		const catalogRows = computed(() =>
			toRequestRows(
				store.requests(),
				store.responses(),
				store.users(),
				text.translator()
			)
		);
		const releaseRows = computed(() =>
			toReleaseRequestRows(
				store.releaseRequests(),
				store.users(),
				store.releases(),
				text.catalog()
			)
		);
		const feed = computed(() =>
			toRequestFeed(catalogRows(), releaseRows())
		);
		const byKind = computed(() => {
			const kind = store.kindFilter();

			return kind === 'all'
				? feed()
				: feed().filter((entry) => entry.kind === kind);
		});

		return {
			loading: computed(
				() => store.loadingRequests() || store.loadingReleaseRequests()
			),
			entries: computed(() => {
				const status = store.statusFilter();

				return status === 'all'
					? byKind()
					: byKind().filter((entry) => entry.row.status === status);
			}),
			/** How many of each status there are, of the kind on show. */
			counts: computed(() => {
				const counts = {
					pending: 0,
					approved: 0,
					'partially-approved': 0,
					rejected: 0,
					all: 0,
				};

				for (const entry of byKind()) {
					counts[entry.row.status] += 1;
					counts.all += 1;
				}

				return counts;
			}),
			/** How many of each kind there are, at the status on show. */
			kindCounts: computed<KindCounts>(() => {
				const status = store.statusFilter();
				const counts: KindCounts = { all: 0, catalog: 0, release: 0 };

				for (const entry of feed()) {
					if (status !== 'all' && entry.row.status !== status) {
						continue;
					}

					counts[entry.kind] += 1;
					counts.all += 1;
				}

				return counts;
			}),
		};
	}),
	withMethods(
		(
			store,
			requestEffect = inject(RequestEffect),
			releaseRequestEffect = inject(ReleaseRequestEffect),
			releaseStateService = inject(ReleaseStateService),
			authenticationStateService = inject(AuthenticationStateService)
		) => {
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
						[requestId]: {
							...draft,
							[field]: { ...held, ...verdict },
						},
					},
				});
			};

			return {
				load: rxMethod<void>(
					pipe(
						switchMap(() => requestEffect.listAll$()),
						tapResponse({
							next: (requests) =>
								patchState(store, {
									requests,
									loadingRequests: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { loadingRequests: false });
							},
						})
					)
				),
				loadReleaseRequests: rxMethod<void>(
					pipe(
						switchMap(() => releaseRequestEffect.listAll$()),
						tapResponse({
							next: (releaseRequests) =>
								patchState(store, {
									releaseRequests,
									loadingReleaseRequests: false,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, {
									loadingReleaseRequests: false,
								});
							},
						})
					)
				),
				loadResponses: rxMethod<void>(
					pipe(
						switchMap(() => requestEffect.listAllResponses$()),
						tapResponse({
							next: (responses) =>
								patchState(store, { responses }),
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
				/** The catalog releases, to approve with one of the album's. */
				loadReleases: rxMethod<void>(
					pipe(
						switchMap(() => releaseStateService.selectEntities$()),
						tap((releases) => {
							if (!releases.length) {
								releaseStateService.dispatchListEntitiesAction();
							}
						}),
						tapResponse({
							next: (releases) => patchState(store, { releases }),
							error: (error) => console.error(error),
						})
					)
				),
				loadAdmin: rxMethod<void>(
					pipe(
						switchMap(() =>
							authenticationStateService.selectAuthenticatedUser$()
						),
						tap((user) =>
							patchState(store, { adminUid: user?.uid || null })
						)
					)
				),
				setStatusFilter(statusFilter: StatusFilter): void {
					patchState(store, { statusFilter });
				},
				setKindFilter(kindFilter: KindFilter): void {
					patchState(store, { kindFilter });
				},
				/** Takes the field in, or turns it down — the reason comes next. */
				setVerdict(input: {
					requestId: string;
					field: string;
					kind: EntityRequestVerdictKind;
				}): void {
					patchDraft(input.requestId, input.field, {
						kind: input.kind,
					});
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
				 * Sends the decision. Whether it may be sent at all is the
				 * card's question — every field answered, every refusal
				 * reasoned — and the server asks it again either way.
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
											reason:
												verdict.reason.trim() || null,
										})
									),
									adminNote:
										store.adminNotes()[requestId]?.trim() ||
										null,
								})
								.pipe(
									tapResponse({
										next: () => {
											const drafts = {
												...store.drafts(),
											};

											delete drafts[requestId];
											patchState(store, {
												busyId: null,
												drafts,
											});
										},
										error: (error) => {
											console.error(error);
											patchState(store, {
												busyId: null,
											});
											setError(
												requestId,
												errorKeyOf(error)
											);
										},
									})
								);
						})
					)
				),
				/** A release request: import the pressing, or link a release. */
				approve: rxMethod<{ id: string; releaseUid: string | null }>(
					pipe(
						filter(() => !store.busyId()),
						tap(({ id }) => {
							patchState(store, { busyId: id });
							setError(id, null);
						}),
						exhaustMap(({ id, releaseUid }) =>
							releaseRequestEffect.approve$(id, releaseUid).pipe(
								tapResponse({
									next: () =>
										patchState(store, { busyId: null }),
									error: (error) => {
										console.error(error);
										patchState(store, { busyId: null });
										setError(id, releaseErrorKeyOf(error));
									},
								})
							)
						)
					)
				),
				reject: rxMethod<{ id: string; note: string | null }>(
					pipe(
						filter(() => !store.busyId() && !!store.adminUid()),
						tap(({ id }) => {
							patchState(store, { busyId: id });
							setError(id, null);
						}),
						map(({ id, note }) => ({
							id,
							reject$: releaseRequestEffect.reject$(
								id,
								note,
								store.adminUid() ?? ''
							),
						})),
						exhaustMap(({ id, reject$ }) =>
							reject$.pipe(
								tapResponse({
									next: () =>
										patchState(store, { busyId: null }),
									error: (error) => {
										console.error(error);
										patchState(store, { busyId: null });
										setError(id, releaseErrorKeyOf(error));
									},
								})
							)
						)
					)
				),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadReleaseRequests(of(undefined));
			store.loadResponses(of(undefined));
			store.loadUsers(of(undefined));
			store.loadReleases(of(undefined));
			store.loadAdmin(of(undefined));
		},
	})
);
