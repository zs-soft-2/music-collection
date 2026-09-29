import { Provider } from '@angular/core';
import { ReleaseDeletionRepository } from '@music-collection/api';

import { ReleaseDeletionEffect } from './release-deletion.effect';
import { ReleaseDeletionFirestoreRepository } from './release-deletion.repository.impl';

/**
 * Binds the Firestore implementation to the deletion contract.
 *
 * Provided where the admin list is, not at the root: only an admin page
 * deletes a pressing, and a root provider would pull the callable client
 * into the main bundle for every visitor who never sees that page.
 */
export function provideReleaseDeletion(): Provider[] {
	return [
		ReleaseDeletionEffect,
		{
			provide: ReleaseDeletionRepository,
			useExisting: ReleaseDeletionFirestoreRepository,
		},
	];
}
