import { exhaustMap, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { GenreDraft, GenreEntity } from '@music-collection/api';
import { GenreEffect } from '@music-collection/domain/genre';
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

/** A genre being written: the one edited, or the one being added (`uid` null). */
interface GenreEdit {
	uid: string | null;
	draft: GenreDraft;
}

interface GenreAdminState {
	genres: GenreEntity[];
	isLoading: boolean;
	/**
	 * The genre being written, null while the list is only being read. Named
	 * apart from the `edit` method: a store's methods and its state share one
	 * namespace, and the method would shadow the signal.
	 */
	editor: GenreEdit | null;
	/** The genre the delete confirmation is open for. */
	pendingDeletion: GenreEntity | null;
	isSaving: boolean;
	error: string | null;
	/** Epoch milliseconds of the last successful write; null until one. */
	savedAt: number | null;
}

const EMPTY_DRAFT: GenreDraft = {
	name: '',
	description: null,
	styles: [],
	active: true,
};

const initialState: GenreAdminState = {
	genres: [],
	isLoading: true,
	editor: null,
	pendingDeletion: null,
	isSaving: false,
	error: null,
	savedAt: null,
};

const sameName = (left: string, right: string): boolean =>
	left.trim().toLowerCase() === right.trim().toLowerCase();

/**
 * Admin: the genre taxonomy — the genres the catalog files records under and
 * the styles under each one.
 *
 * It used to be an enum of one genre and a flat list of its styles; a shelf
 * that holds more than rock records needs it to be data, and this is where it
 * is edited. Nothing else writes it: the forms read it, the imports match
 * against it.
 */
export const GenreAdminStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** How many styles the taxonomy holds altogether. */
		styleCount: computed(() =>
			store
				.genres()
				.reduce((total, genre) => total + genre.styles.length, 0)
		),
		/** Whether the genre being written can be saved as it stands. */
		canSave: computed(() => {
			const edit = store.editor();

			if (!edit?.draft.name.trim()) {
				return false;
			}

			return !store
				.genres()
				.some(
					(genre) =>
						genre.uid !== edit.uid &&
						sameName(genre.name, edit.draft.name)
				);
		}),
	})),
	withMethods((store, effect = inject(GenreEffect)) => ({
		load: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isLoading: true })),
				switchMap(() => effect.taxonomy$),
				tapResponse({
					next: (genres) =>
						patchState(store, { genres, isLoading: false }),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isLoading: false,
							error: error.message,
						});
					},
				})
			)
		),

		/** Opens an existing genre for editing. */
		edit: (genre: GenreEntity) =>
			patchState(store, {
				editor: {
					uid: genre.uid,
					draft: {
						name: genre.name,
						description: genre.description ?? null,
						styles: [...genre.styles],
						active: genre.active !== false,
					},
				},
				error: null,
				savedAt: null,
			}),

		/** Opens an empty genre. */
		add: () =>
			patchState(store, {
				editor: { uid: null, draft: { ...EMPTY_DRAFT, styles: [] } },
				error: null,
				savedAt: null,
			}),

		cancel: () => patchState(store, { editor: null, error: null }),

		setName: (name: string) =>
			patchState(store, patchDraft(store, { name })),
		setDescription: (description: string) =>
			patchState(
				store,
				patchDraft(store, { description: description || null })
			),
		setActive: (active: boolean) =>
			patchState(store, patchDraft(store, { active })),

		/**
		 * The styles of the genre being written, as the chips field hands them
		 * over. It normalises rather than refuses what was typed: the field
		 * takes any word, and two spellings of one style would stand on the
		 * forms as two styles.
		 */
		setStyles: (names: string[]) =>
			patchState(store, patchDraft(store, { styles: toStyleSet(names) })),

		save: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const edit = store.editor();

					if (!edit) {
						return of(null);
					}

					return edit.uid
						? effect.update$(edit.uid, edit.draft)
						: effect.create$(edit.draft);
				}),
				tapResponse({
					next: () =>
						// The list redraws itself from the cache; only the
						// editor closes here.
						patchState(store, {
							editor: null,
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),

		/**
		 * Deleting is asked for twice: a genre is what the styles of every
		 * record under it hang from, and nothing on the client could put it
		 * back.
		 */
		askDeletion: (pendingDeletion: GenreEntity) =>
			patchState(store, { pendingDeletion, error: null }),
		cancelDeletion: () => patchState(store, { pendingDeletion: null }),
		confirmDeletion: rxMethod<void>(
			pipe(
				tap(() => patchState(store, { isSaving: true, error: null })),
				exhaustMap(() => {
					const genre = store.pendingDeletion();

					return genre ? effect.delete$(genre) : of(undefined);
				}),
				tapResponse({
					next: () =>
						patchState(store, {
							pendingDeletion: null,
							isSaving: false,
							savedAt: Date.now(),
						}),
					error: (error: Error) => {
						console.error(error);
						// A genre the catalog still names arrives as
						// `GENRE_IN_USE`, which the page has a sentence of its
						// own for: retire it instead of deleting it.
						patchState(store, {
							isSaving: false,
							error: error.message,
						});
					},
				})
			)
		),
	})),
	withHooks({
		onInit: (store) => store.load(),
	})
);

/** The state patch that changes fields of the genre being written. */
function patchDraft(
	store: { editor: () => GenreEdit | null },
	fields: Partial<GenreDraft>
): Partial<GenreAdminState> {
	const editor = store.editor();

	return editor
		? { editor: { ...editor, draft: { ...editor.draft, ...fields } } }
		: {};
}

/** Trimmed, a set however the styles are cased, in alphabetical order. */
function toStyleSet(names: string[]): string[] {
	const styles: string[] = [];

	for (const name of names) {
		const style = name.trim();

		if (style && !styles.some((held) => sameName(held, style))) {
			styles.push(style);
		}
	}

	return styles.sort((left, right) => left.localeCompare(right));
}
