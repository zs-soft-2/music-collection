import { Provider } from '@angular/core';
import { GenreRepository } from '@music-collection/api';

import { GenreFirestoreRepository } from './genre.repository.impl';

/** Binds the Firestore implementation to the taxonomy contract. */
export function provideGenre(): Provider[] {
	return [
		{
			provide: GenreRepository,
			useExisting: GenreFirestoreRepository,
		},
	];
}
