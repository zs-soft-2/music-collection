import { Observable, map } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import {
	BAND_OF_THE_WEEK_FEATURE_KEY,
	BandOfTheWeek,
} from '@music-collection/api';

/**
 * Data access for the band of the week: one document a week, read by its id.
 *
 * Read straight from Firestore rather than through `FirestoreSyncService`
 * like the catalog: a document a week is not a catalog collection to be
 * cached whole, and the week's id is all it takes to name the one worth
 * reading. Nothing here is written from the client — the weekly run chooses.
 */
@Injectable({ providedIn: 'root' })
export class BandOfTheWeekRepository {
	private readonly firestore = inject(Firestore);
	private readonly injector = inject(Injector);

	/** One week's band; null on a week no run has chosen one for. */
	public week$(week: string): Observable<BandOfTheWeek | null> {
		// AngularFire wants its APIs in an injection context, and this runs
		// from a stream long after the repository was built.
		return runInInjectionContext(this.injector, () =>
			docData(
				doc(this.firestore, BAND_OF_THE_WEEK_FEATURE_KEY, week)
			).pipe(map((data) => (data as BandOfTheWeek | undefined) ?? null))
		);
	}
}
