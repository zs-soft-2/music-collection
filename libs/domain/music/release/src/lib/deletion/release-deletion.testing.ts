import { Observable, of } from 'rxjs';

import { Provider } from '@angular/core';
import { EMPTY_ENTITY_USAGE, EntityUsage } from '@music-collection/api';

import { ReleaseDeletionFirestoreRepository } from './release-deletion.repository.impl';

/**
 * The deletion chain without Firestore behind it.
 *
 * The admin list provides the real repository itself, so a component test
 * would reach for `Firestore` and the callable client just by rendering the
 * table. This stands in for the implementation class the list binds, which
 * is what makes it take: a component's own provider wins over the TestBed's,
 * but `useExisting` still resolves to whatever the root holds.
 */
export function provideReleaseDeletionTesting(
	usage: EntityUsage = EMPTY_ENTITY_USAGE
): Provider[] {
	return [
		{
			provide: ReleaseDeletionFirestoreRepository,
			useValue: {
				usage$: (): Observable<EntityUsage> => of(usage),
				delete$: (): Observable<void> => of(undefined),
				archive$: (): Observable<void> => of(undefined),
			},
		},
	];
}
