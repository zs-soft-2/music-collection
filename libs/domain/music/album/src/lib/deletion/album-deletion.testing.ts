import { Observable, of } from 'rxjs';

import { Provider } from '@angular/core';
import { EMPTY_ENTITY_USAGE, EntityUsage } from '@music-collection/api';

import { AlbumDeletionFirestoreRepository } from './album-deletion.repository.impl';

/**
 * The deletion chain without Firestore behind it. Stands in for the class
 * the list binds with `useExisting`, so the table renders in a test without
 * reaching for `Firestore` and the callable client.
 */
export function provideAlbumDeletionTesting(
	usage: EntityUsage = EMPTY_ENTITY_USAGE
): Provider[] {
	return [
		{
			provide: AlbumDeletionFirestoreRepository,
			useValue: {
				usage$: (): Observable<EntityUsage> => of(usage),
				delete$: (): Observable<void> => of(undefined),
			},
		},
	];
}
