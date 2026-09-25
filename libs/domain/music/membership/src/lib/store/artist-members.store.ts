import { exhaustMap, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { MembershipEntity, MusicianEntity } from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { MembershipDraft, MembershipEffect } from '../data/membership.effect';

interface ArtistMembersState {
	artistUid: string;
	artistName: string;
	rows: MembershipEntity[];
	isLoading: boolean;
	/** The row being added or edited; null while the form is closed. */
	draft: MembershipDraft | null;
	/** The saved document behind the draft, to keep its album counts. */
	editedRow: MembershipEntity | null;
	isSaving: boolean;
	/** Names offered for the musician field. */
	musicianOptions: MusicianEntity[];
	pendingDeletion: MembershipEntity | null;
	error: string | null;
}

const initialState: ArtistMembersState = {
	artistUid: '',
	artistName: '',
	rows: [],
	isLoading: true,
	draft: null,
	editedRow: null,
	isSaving: false,
	musicianOptions: [],
	pendingDeletion: null,
	error: null,
};

/** An empty row, ready for a musician to be picked into it. */
const emptyDraft = (
	artistUid: string,
	artistName: string,
	kind: 'member' | 'guest'
): MembershipDraft => ({
	uid: null,
	artistUid,
	artistName,
	musicianUid: '',
	musicianName: '',
	kind,
	instruments: [],
	from: null,
	to: null,
	active: kind === 'member',
});

const toDraft = (row: MembershipEntity): MembershipDraft => ({
	uid: row.uid,
	artistUid: row.artistUid,
	artistName: row.artistName,
	musicianUid: row.musicianUid,
	musicianName: row.musicianName,
	kind: row.kind,
	instruments: [...(row.instruments ?? [])],
	from: row.from,
	to: row.to,
	active: !!row.active,
});

const describeError = (error: unknown): string => {
	const code = (error as { code?: string })?.code ?? '';

	return code.includes('permission-denied')
		? 'ui.artistMembers.error-permission'
		: 'ui.artistMembers.error-general';
};

/**
 * Admin: a band's line-up. The rows come from the `membership` documents the
 * Discogs import writes, and this is where they are corrected — years,
 * instruments, member or guest — and where a musician missing from the
 * line-up is added.
 */
export const ArtistMembersStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		members: computed(() =>
			store
				.rows()
				.filter((row) => row.kind === 'member')
				.sort(
					(a, b) =>
						Number(!!b.active) - Number(!!a.active) ||
						(a.from ?? 9999) - (b.from ?? 9999) ||
						a.musicianName.localeCompare(b.musicianName)
				)
		),
		guests: computed(() =>
			store
				.rows()
				.filter((row) => row.kind !== 'member')
				.sort(
					(a, b) =>
						b.albumCount - a.albumCount ||
						a.musicianName.localeCompare(b.musicianName)
				)
		),
		/** A draft is only saveable once it names a musician. */
		isSaveable: computed(() => !!store.draft()?.musicianUid),
	})),
	withMethods((store, effect = inject(MembershipEffect)) => ({
		load: rxMethod<string>(
			pipe(
				tap((artistUid) =>
					patchState(store, { artistUid, isLoading: true })
				),
				switchMap((artistUid) => effect.loadLineup$(artistUid)),
				tapResponse({
					next: ({ artistName, rows }) =>
						patchState(store, {
							artistName,
							rows,
							isLoading: false,
						}),
					error: (error) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: describeError(error),
						});
					},
				})
			)
		),
		startAdd: (kind: 'member' | 'guest') =>
			patchState(store, {
				draft: emptyDraft(store.artistUid(), store.artistName(), kind),
				editedRow: null,
				musicianOptions: [],
				error: null,
			}),
		startEdit: (row: MembershipEntity) =>
			patchState(store, {
				draft: toDraft(row),
				editedRow: row,
				musicianOptions: [],
				error: null,
			}),
		cancelEdit: () =>
			patchState(store, {
				draft: null,
				editedRow: null,
				musicianOptions: [],
			}),
		patchDraft: (patch: Partial<MembershipDraft>) => {
			const draft = store.draft();

			if (draft) {
				patchState(store, { draft: { ...draft, ...patch } });
			}
		},
		searchMusicians: rxMethod<string>(
			pipe(
				switchMap((term) =>
					term.trim().length < 2
						? of([])
						: effect.searchMusicians$(term.trim())
				),
				tapResponse({
					next: (musicianOptions) =>
						patchState(store, { musicianOptions }),
					error: (error) => {
						console.error(error);
						patchState(store, { musicianOptions: [] });
					},
				})
			)
		),
		/**
		 * A musician the catalog does not know yet. Created with the name
		 * alone, so the line-up can be finished without leaving the tab; the
		 * rest of the profile is filled in on the musician's own page.
		 */
		createMusician: rxMethod<string>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap((name) => effect.createMusician$(name.trim())),
				tapResponse({
					next: (musician) => {
						const draft = store.draft();

						patchState(store, {
							isSaving: false,
							musicianOptions: [],
							draft: draft && {
								...draft,
								musicianUid: musician.uid,
								musicianName: musician.name,
							},
						});
					},
					error: (error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: describeError(error),
						});
					},
				})
			)
		),
		/**
		 * Saves the open row. The band and the musician are the document's
		 * identity, so a musician already in the line-up is reported rather
		 * than written over their own row.
		 */
		save: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const draft = store.draft();

					if (!draft?.musicianUid) {
						return of('missing' as const);
					}

					const twin = store
						.rows()
						.some(
							(row) =>
								row.musicianUid === draft.musicianUid &&
								row.uid !== draft.uid
						);

					return twin
						? of('duplicate' as const)
						: effect
								.save$(draft, store.editedRow() ?? undefined)
								.pipe(map(() => 'saved' as const));
				}),
				tapResponse({
					next: (result) =>
						patchState(store, {
							isSaving: false,
							...(result === 'saved'
								? { draft: null, editedRow: null }
								: result === 'duplicate'
									? {
											error: 'ui.artistMembers.error-duplicate',
										}
									: {}),
						}),
					error: (error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: describeError(error),
						});
					},
				})
			)
		),
		askDeletion: (pendingDeletion: MembershipEntity) =>
			patchState(store, { pendingDeletion, error: null }),
		cancelDeletion: () => patchState(store, { pendingDeletion: null }),
		confirmDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true })),
				exhaustMap(() => {
					const uid = store.pendingDeletion()?.uid;

					return uid ? effect.remove$(uid) : of(undefined);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							pendingDeletion: null,
							isSaving: false,
						}),
					error: (error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							pendingDeletion: null,
							error: describeError(error),
						});
					},
				})
			)
		),
	}))
);
