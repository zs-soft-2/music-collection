import { Observable, of } from 'rxjs';

import { Provider } from '@angular/core';
import {
	EntityTypeEnum,
	GenreDraft,
	GenreEntity,
	GenreRepository,
	toGenreSlug,
} from '@music-collection/api';

/** A genre as a test needs it: a name and the styles under it. */
export function genreOf(name: string, styles: string[] = []): GenreEntity {
	return {
		active: true,
		description: null,
		entityType: EntityTypeEnum.Genre,
		name,
		slug: toGenreSlug(name),
		styles,
		uid: toGenreSlug(name),
	};
}

/**
 * The taxonomy a test runs against, in memory. Anything that reads a genre —
 * both catalog forms, the collection editor — goes through `GenreRepository`,
 * so this is the one thing a test has to provide, and the genres it names are
 * the whole taxonomy as far as that test is concerned.
 */
export function provideGenreTesting(genres: GenreEntity[] = []): Provider[] {
	return [
		{
			provide: GenreRepository,
			useValue: {
				list$: (): Observable<GenreEntity[]> => of(genres),
				create$: (genre: GenreDraft): Observable<GenreEntity> =>
					of(genreOf(genre.name, genre.styles)),
				update$: (
					uid: string,
					genre: GenreDraft
				): Observable<GenreEntity> =>
					of({ ...genreOf(genre.name, genre.styles), uid }),
				delete$: (): Observable<void> => of(undefined),
				isInUse$: (): Observable<boolean> => of(false),
			},
		},
	];
}
