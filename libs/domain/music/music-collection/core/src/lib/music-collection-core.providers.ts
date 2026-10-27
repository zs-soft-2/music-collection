import { Provider } from '@angular/core';
import { MusicCollectionRepository } from '@music-collection/domain/music-collection/api';

import { MusicCollectionFirestoreRepository } from './music-collection.repository.impl';

/** Binds the Firestore implementation to the repository contract. */
export function provideMusicCollection(): Provider[] {
	return [
		{
			provide: MusicCollectionRepository,
			useExisting: MusicCollectionFirestoreRepository,
		},
	];
}
