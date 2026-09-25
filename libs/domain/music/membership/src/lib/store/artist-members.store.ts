import { exhaustMap, map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AlbumEntity,
	ArtistEntity,
	ArtistExternalCandidate,
	MembershipEntity,
	MusicianEntity,
	toMusicBrainzId,
} from '@music-collection/api';
import { isCurrentMember } from '@music-collection/ui/music-view';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { toCatalogInstruments } from '../data/instruments';
import { LineupCandidate } from '../data/lineup-candidates';
import {
	LineupLookupResult,
	MembershipDraft,
	MembershipEffect,
} from '../data/membership.effect';

/** A candidate as the load dialog lists it. */
export interface CandidateRow extends LineupCandidate {
	/** Whether the row is written when the dialog is applied. */
	selected: boolean;
}

interface ArtistMembersState {
	artistUid: string;
	artistName: string;
	artist: ArtistEntity | undefined;
	/** The band's albums, which the catalog's credits are read through. */
	albums: AlbumEntity[];
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
	/** The loaded candidates; null while the load dialog is closed. */
	candidates: CandidateRow[] | null;
	isLoadingCandidates: boolean;
	/** True when the last load could not reach MusicBrainz. */
	externalFailed: boolean;
	/** Bands of the same name to choose between, when the id is unknown. */
	namesakes: ArtistExternalCandidate[] | null;
	/**
	 * The namesake picked here, for as long as the tab is open. Saving the
	 * id on the details tab is what makes the choice outlast the page.
	 */
	pickedMusicBrainzId: string | null;
	error: string | null;
}

const initialState: ArtistMembersState = {
	artistUid: '',
	artistName: '',
	artist: undefined,
	albums: [],
	rows: [],
	isLoading: true,
	draft: null,
	editedRow: null,
	isSaving: false,
	musicianOptions: [],
	pendingDeletion: null,
	candidates: null,
	isLoadingCandidates: false,
	externalFailed: false,
	namesakes: null,
	pickedMusicBrainzId: null,
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
	// An older row may hold what an import wrote; the field speaks the
	// list's own words, and a row edited at all is corrected to them.
	instruments: toCatalogInstruments(row.instruments ?? []),
	from: row.from,
	to: row.to,
	active: isCurrentMember(row),
});

/**
 * The row as the line-up reads it: an end year left empty means the musician
 * is still in the band, whatever the imported flag holds.
 */
const withCurrent = (row: MembershipEntity): MembershipEntity => ({
	...row,
	active: isCurrentMember(row),
});

/** What the candidate lookup needs, read off the store as it stands. */
const lookup = (
	store: {
		artistUid: () => string;
		artistName: () => string;
		albums: () => AlbumEntity[];
		rows: () => MembershipEntity[];
	},
	musicBrainzId: string | null
) => ({
	artistUid: store.artistUid(),
	artistName: store.artistName(),
	albums: store.albums(),
	musicBrainzId,
	existing: store.rows(),
});

const toRows = (candidates: LineupCandidate[]): CandidateRow[] =>
	candidates.map((candidate) => ({ ...candidate, selected: true }));

/** Nothing found is worth a sentence; a pending namesake question is not. */
const emptyError = (
	result?: LineupLookupResult,
	namesakes?: ArtistExternalCandidate[]
): string | null =>
	!result || result.candidates.length || namesakes
		? null
		: 'ui.artistMembers.error-nothing-found';

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
				.map(withCurrent)
				.sort(
					(a, b) =>
						Number(b.active) - Number(a.active) ||
						(a.from ?? 9999) - (b.from ?? 9999) ||
						a.musicianName.localeCompare(b.musicianName)
				)
		),
		guests: computed(() =>
			store
				.rows()
				.filter((row) => row.kind !== 'member')
				.map(withCurrent)
				.sort(
					(a, b) =>
						b.albumCount - a.albumCount ||
						a.musicianName.localeCompare(b.musicianName)
				)
		),
		/** A draft is only saveable once it names a musician. */
		isSaveable: computed(() => !!store.draft()?.musicianUid),
		selectedCandidates: computed(
			() => store.candidates()?.filter((row) => row.selected) ?? []
		),
	})),
	withMethods((store, effect = inject(MembershipEffect)) => ({
		load: rxMethod<string>(
			pipe(
				tap((artistUid) =>
					patchState(store, { artistUid, isLoading: true })
				),
				switchMap((artistUid) => effect.loadLineup$(artistUid)),
				tapResponse({
					next: ({ artist, artistName, rows }) =>
						patchState(store, {
							artist,
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
		/** The band's albums, kept current while the tab is open. */
		loadAlbums: rxMethod<string>(
			pipe(
				switchMap((artistUid) => effect.loadAlbums$(artistUid)),
				tapResponse({
					next: (albums) => patchState(store, { albums }),
					error: (error) => console.error(error),
				})
			)
		),
		/**
		 * Offers the line-up both sources know about. Without a MusicBrainz
		 * id the band is searched by name first, and where several bands
		 * carry it the admin is asked which theirs is — a namesake's members
		 * are worse than none.
		 */
		loadCandidates: rxMethod<void>(
			pipe(
				tap(() =>
					patchState(store, {
						isLoadingCandidates: true,
						error: null,
					})
				),
				exhaustMap(() => {
					const musicBrainzId =
						toMusicBrainzId(store.artist()?.musicBrainzId) ??
						store.pickedMusicBrainzId();

					if (musicBrainzId) {
						return effect
							.loadCandidates$(lookup(store, musicBrainzId))
							.pipe(map((result) => ({ result })));
					}

					return effect
						.searchExternalArtists$({
							country: store.artist()?.country ?? null,
							musicBrainzId: store.artist()?.musicBrainzId,
							name: store.artistName(),
							styles: store.artist()?.styles ?? [],
						})
						.pipe(
							switchMap((hits) =>
								hits.length > 1
									? of({ namesakes: hits })
									: effect
											.loadCandidates$(
												lookup(
													store,
													hits[0]?.musicBrainzId ??
														null
												)
											)
											.pipe(map((result) => ({ result })))
							)
						);
				}),
				tapResponse({
					next: (found: {
						result?: LineupLookupResult;
						namesakes?: ArtistExternalCandidate[];
					}) =>
						patchState(store, {
							isLoadingCandidates: false,
							namesakes: found.namesakes ?? null,
							externalFailed: !!found.result?.externalFailed,
							candidates: found.result
								? toRows(found.result.candidates)
								: null,
							error: emptyError(found.result, found.namesakes),
						}),
					error: (error) => {
						console.error(error);
						patchState(store, {
							isLoadingCandidates: false,
							error: describeError(error),
						});
					},
				})
			)
		),
		/** Loads the line-up of the namesake the admin picked. */
		chooseNamesake: rxMethod<ArtistExternalCandidate>(
			pipe(
				tap((candidate) =>
					patchState(store, {
						namesakes: null,
						isLoadingCandidates: true,
						pickedMusicBrainzId: candidate.musicBrainzId,
					})
				),
				exhaustMap((candidate) =>
					effect.loadCandidates$(
						lookup(store, candidate.musicBrainzId)
					)
				),
				tapResponse({
					next: (result) =>
						patchState(store, {
							isLoadingCandidates: false,
							externalFailed: result.externalFailed,
							candidates: toRows(result.candidates),
							error: emptyError(result),
						}),
					error: (error) => {
						console.error(error);
						patchState(store, {
							isLoadingCandidates: false,
							error: describeError(error),
						});
					},
				})
			)
		),
		closeNamesakes: () => patchState(store, { namesakes: null }),
		closeCandidates: () => patchState(store, { candidates: null }),
		toggleCandidate: (row: CandidateRow) =>
			patchState(store, {
				candidates:
					store.candidates()?.map((candidate) =>
						candidate === row
							? {
									...candidate,
									selected: !candidate.selected,
								}
							: candidate
					) ?? null,
			}),
		toggleAllCandidates: (selected: boolean) =>
			patchState(store, {
				candidates:
					store
						.candidates()
						?.map((candidate) => ({ ...candidate, selected })) ??
					null,
			}),
		/** Writes the ticked candidates as line-up rows. */
		applyCandidates: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() =>
					effect.applyCandidates$(
						store.candidates()?.filter((row) => row.selected) ?? [],
						store.artistUid(),
						store.artistName()
					)
				),
				tapResponse({
					next: () =>
						patchState(store, {
							isSaving: false,
							candidates: null,
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
