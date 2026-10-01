import { exhaustMap, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { TextService } from '@music-collection/core/i18n';
import {
	DiscographyCandidate,
	DiscographyCreation,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
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

import { describeWriteError } from './music-collection-admin.errors';
import { toRowGroups, toRows } from './music-collection-admin.mapper';
import { CollectionRow } from './music-collection-admin.model';

export type StatusFilter = 'all' | 'draft' | 'published';

/** Bands offered at once; the search narrows down to the rest. */
const CANDIDATE_LIMIT = 12;

interface MusicCollectionAdminState {
	rows: CollectionRow[];
	isLoading: boolean;
	statusFilter: StatusFilter;
	/** The collection the delete confirmation is open for. */
	pendingDeletion: CollectionRow | null;
	/** The collection being deleted. */
	busyUid: string | null;
	error: string | null;
	/**
	 * The bands a discography can be opened for; null while the picker has
	 * not been opened. The catalog answers this, so it costs nothing until
	 * somebody asks.
	 */
	candidates: DiscographyCandidate[] | null;
	/** Free text over the band names. */
	candidateQuery: string;
	/** The band whose pair is being written. */
	busyArtistUid: string | null;
	/** What the last opened discography created, for the page to report. */
	created: DiscographyCreation | null;
}

const initialState: MusicCollectionAdminState = {
	rows: [],
	isLoading: true,
	statusFilter: 'all',
	pendingDeletion: null,
	busyUid: null,
	error: null,
	candidates: null,
	candidateQuery: '',
	busyArtistUid: null,
	created: null,
};

/** Admin: the collection definitions, with what each one catches. */
export const MusicCollectionAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		visibleRows: computed(() => {
			const status = store.statusFilter();

			return status === 'all'
				? store.rows()
				: store.rows().filter((row) => row.status === status);
		}),
		counts: computed(() => {
			const counts = { all: 0, draft: 0, published: 0 };

			for (const row of store.rows()) {
				counts[row.status] += 1;
				counts.all += 1;
			}

			return counts;
		}),
		/** Whether the picker is open at all. */
		showsDiscographyPicker: computed(() => store.candidates() !== null),
		/** Every band worth a discography, however many are shown. */
		candidateCount: computed(() => store.candidates()?.length ?? 0),
		/**
		 * The bands on offer: the search first, then as many as fit. A band
		 * one rule already follows stays in the list rather than being
		 * dropped, because "already taken, by this" is the answer to why it
		 * cannot be opened again.
		 */
		candidateMatches: computed(() => {
			const query = store.candidateQuery().trim().toLowerCase();
			const candidates = store.candidates() ?? [];

			return (
				query
					? candidates.filter((candidate) =>
							candidate.artistName.toLowerCase().includes(query)
						)
					: candidates
			).slice(0, CANDIDATE_LIMIT);
		}),
	})),
	withComputed((store) => ({
		/** The rows under their headings; a group with nothing in it is left out. */
		groups: computed(() => toRowGroups(store.visibleRows())),
	})),
	withMethods(
		(
			store,
			effect = inject(MusicCollectionEffect),
			text = inject(TextService)
		) => ({
			load: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { isLoading: true })),
					switchMap(() => effect.listAllResolutions$()),
					tapResponse({
						next: (resolutions) =>
							patchState(store, {
								rows: toRows(resolutions, text.translator()),
								isLoading: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								isLoading: false,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
			setStatusFilter: (statusFilter: StatusFilter) =>
				patchState(store, { statusFilter }),
			/**
			 * The bands worth a discography. Kept subscribed while the picker
			 * is open, so a band the admin has just opened a pair for turns
			 * into "already followed" in front of them.
			 */
			openDiscographyPicker: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, {
							candidates: [],
							candidateQuery: '',
							created: null,
							error: null,
						})
					),
					switchMap(() => effect.listDiscographyCandidates$()),
					tapResponse({
						next: (candidates: DiscographyCandidate[]) =>
							patchState(store, { candidates }),
						error: (error) => {
							console.error(error);
							patchState(store, {
								error: describeWriteError(error),
							});
						},
					})
				)
			),
			closeDiscographyPicker: () =>
				patchState(store, { candidates: null, candidateQuery: '' }),
			setCandidateQuery: (candidateQuery: string) =>
				patchState(store, { candidateQuery }),
			/**
			 * Opens the pair for one band. `exhaustMap`: a second click while
			 * the first pair is being written would ask for the same slugs,
			 * and the server would refuse the second one.
			 */
			createDiscography: rxMethod<DiscographyCandidate>(
				pipe(
					tap((candidate) =>
						patchState(store, {
							busyArtistUid: candidate.artistUid,
							created: null,
							error: null,
						})
					),
					exhaustMap((candidate) =>
						effect.createDiscography$(candidate).pipe(
							tapResponse({
								next: (created: DiscographyCreation) =>
									// The new pair reaches the list through
									// the cache; only the report is set here.
									patchState(store, {
										created,
										busyArtistUid: null,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										busyArtistUid: null,
										error: describeWriteError(error),
									});
								},
							})
						)
					)
				)
			),
			/**
			 * Deleting is asked for twice: the definition is what a badge is
			 * measured against, and it cannot be brought back from the client.
			 */
			askDeletion: (pendingDeletion: CollectionRow) =>
				patchState(store, { pendingDeletion, error: null }),
			cancelDeletion: () => patchState(store, { pendingDeletion: null }),
			confirmDeletion: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, {
							busyUid: store.pendingDeletion()?.uid ?? null,
							error: null,
						})
					),
					exhaustMap(() => {
						const uid = store.pendingDeletion()?.uid;

						return uid ? effect.delete$(uid) : of(undefined);
					}),
					tapResponse({
						next: () =>
							// A törölt definíció a cache-ből is kiesik, a lista
							// magától újrarajzolódik — csak a párbeszéd zárul itt.
							patchState(store, {
								pendingDeletion: null,
								busyUid: null,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, {
								busyUid: null,
								error: describeWriteError(error),
							});
						},
					})
				)
			),
		})
	),
	withMethods((store) => ({
		/**
		 * The one button both opens the picker and closes it again — reaching
		 * for it twice is how somebody changes their mind, not how they ask
		 * for the band list a second time.
		 */
		toggleDiscographyPicker: (): void => {
			if (store.showsDiscographyPicker()) {
				store.closeDiscographyPicker();
			} else {
				store.openDiscographyPicker();
			}
		},
	})),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
		},
	})
);
