import { Provider } from '@angular/core';
import { ConcertRepository, VenueRepository } from '@music-collection/api';

import { ConcertEffect } from './concert.effect';
import { ConcertFirestoreRepository } from './concert.repository.impl';
import { VenueFirestoreRepository } from './venue.repository.impl';

/**
 * Binds the Firestore implementations to the concert contracts, and provides
 * the effect alongside them.
 *
 * Goes on the two concert routes rather than in the app config: both pages are
 * lazy and nothing else reads a concert, so this keeps the lib out of the main
 * bundle. The effect belongs in the same list — provided in the root it would
 * look for these repositories in an injector that cannot see them.
 */
export function provideConcert(): Provider[] {
	return [
		ConcertEffect,
		{
			provide: ConcertRepository,
			useExisting: ConcertFirestoreRepository,
		},
		{
			provide: VenueRepository,
			useExisting: VenueFirestoreRepository,
		},
	];
}
