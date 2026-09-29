import { Observable, map, shareReplay, startWith, switchMap, throwError } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	GenreDraft,
	GenreEntity,
	GenreRepository,
	StyleName,
	activeGenres,
	allStyles,
	styleOptions,
} from '@music-collection/api';

/** A genre the catalog still names cannot be deleted; it is retired instead. */
export const GENRE_IN_USE = 'genre-in-use';

/**
 * The taxonomy as the rest of the app asks for it: the genres, the styles
 * under one, and the writes an admin makes.
 *
 * It is read from many places at once — both catalog forms, the admin page,
 * every import that matches a source's style names — so the list is shared
 * rather than queried again, and it starts empty rather than pending: a form
 * that waited for it would stay blank for good if a rule or an index were
 * missing (the sync never errors, it simply never emits).
 */
@Injectable({ providedIn: 'root' })
export class GenreEffect {
	private readonly repository = inject(GenreRepository);

	/** Every genre by name, the empty list until the first answer arrives. */
	public readonly taxonomy$: Observable<GenreEntity[]> = this.repository
		.list$()
		.pipe(
			map((genres) =>
				[...genres].sort((left, right) =>
					left.name.localeCompare(right.name)
				)
			),
			startWith([] as GenreEntity[]),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	/** What a form offers: the genres an admin has not retired. */
	public readonly genres$: Observable<GenreEntity[]> = this.taxonomy$.pipe(
		map(activeGenres)
	);

	/** Every style the taxonomy knows, for an import matching its own names. */
	public readonly styles$: Observable<StyleName[]> =
		this.taxonomy$.pipe(map(allStyles));

	/**
	 * The styles a form offers for the genre it currently holds, the ones
	 * already on the document included — a style saved before the taxonomy
	 * knew it stays selectable instead of being dropped by the next save.
	 */
	public styleOptions$(
		genre$: Observable<string | null>,
		selected: () => StyleName[]
	): Observable<StyleName[]> {
		return genre$.pipe(
			switchMap((name) =>
				this.taxonomy$.pipe(
					map((taxonomy) => styleOptions(taxonomy, name, selected()))
				)
			)
		);
	}

	public create$(genre: GenreDraft): Observable<GenreEntity> {
		return this.repository.create$(genre);
	}

	public update$(uid: string, genre: GenreDraft): Observable<GenreEntity> {
		return this.repository.update$(uid, genre);
	}

	/**
	 * Deleting a genre is refused while the catalog names it: the styles on
	 * those documents would be left without a genre, and nothing on the client
	 * could put them back. Retiring it (`active: false`) takes it off the forms
	 * without touching what is already saved.
	 */
	public delete$(genre: GenreEntity): Observable<void> {
		return this.repository.isInUse$(genre.name).pipe(
			switchMap((inUse) =>
				inUse
					? throwError(() => new Error(GENRE_IN_USE))
					: this.repository.delete$(genre)
			)
		);
	}
}
