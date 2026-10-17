import { Provider } from '@angular/core';
import { AlbumDeletionRepository } from '@music-collection/api';

import { AlbumDeletionEffect } from './album-deletion.effect';
import { AlbumDeletionFirestoreRepository } from './album-deletion.repository.impl';

/**
 * Binds the Firestore implementation to the deletion contract — where the
 * admin list is, not at the root, so the callable client stays out of the
 * main bundle.
 */
export function provideAlbumDeletion(): Provider[] {
	return [
		AlbumDeletionEffect,
		{
			provide: AlbumDeletionRepository,
			useExisting: AlbumDeletionFirestoreRepository,
		},
	];
}
