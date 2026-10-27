import { Observable, catchError, of, shareReplay } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { BandOfTheWeek, bandOfTheWeekId } from '@music-collection/api';

import { BandOfTheWeekRepository } from './band-of-the-week.repository';

/**
 * The band of the week, as the pages need it: this week's, or nothing.
 *
 * The document only names the artist; who they are comes from the catalog
 * the app already holds. That is deliberate — the home page and the radio
 * both want more of the artist than a name, and both have the catalog in
 * hand already.
 *
 * The read is shared: the hero and the radio ask the same question, and it
 * is worth exactly one document read between them.
 */
@Injectable({ providedIn: 'root' })
export class BandOfTheWeekEffect {
	private readonly repository = inject(BandOfTheWeekRepository);

	private readonly current = this.repository.week$(bandOfTheWeekId()).pipe(
		// A week nobody chose a band for is not an error, and neither is a
		// read that fails: the home page has a page to show either way.
		catchError((error) => {
			console.error('The band of the week could not be read', error);

			return of(null);
		}),
		shareReplay({ bufferSize: 1, refCount: true })
	);

	/** This week's band; null before a run has chosen one. */
	public current$(): Observable<BandOfTheWeek | null> {
		return this.current;
	}
}
