import { Observable, catchError, from, map, of } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import {
	DISCOGS_LOOKUP_FUNCTION,
	DiscogsLookupRequest,
	DiscogsLookupResponse,
} from '../../domain/music/external';

/**
 * The Discogs lookups, through the `discogsLookup` callable — the catalog's
 * fallback where MusicBrainz knows an artist or an album nothing.
 *
 * Discogs is not called from the browser: the key rate limit is per token, the
 * search endpoint refuses requests without one, and the answers are worth
 * caching for everyone. The callable does all three.
 */
@Injectable({ providedIn: 'root' })
export class DiscogsLookupClient {
	private functions = inject(Functions);

	public lookup$<K extends DiscogsLookupRequest['kind']>(
		request: Extract<DiscogsLookupRequest, { kind: K }>
	): Observable<DiscogsLookupResponse[K]> {
		const callable = httpsCallable<
			DiscogsLookupRequest,
			DiscogsLookupResponse[K]
		>(this.functions, DISCOGS_LOOKUP_FUNCTION);

		return from(callable(request)).pipe(map((result) => result.data));
	}

	/**
	 * The same lookup, with a miss answered by null instead of an error.
	 *
	 * A fallback asks Discogs about artists and albums it may well not have
	 * either; that is not a failure to report, and it must not take down the
	 * load that had already found what MusicBrainz knows. A logged warning is
	 * left behind so a broken token or a missing deploy is still visible.
	 */
	public lookupOrNull$<K extends DiscogsLookupRequest['kind']>(
		request: Extract<DiscogsLookupRequest, { kind: K }>
	): Observable<DiscogsLookupResponse[K] | null> {
		return this.lookup$(request).pipe(
			catchError((error) => {
				console.warn(`Discogs lookup failed: ${request.kind}`, error);

				return of(null);
			})
		);
	}
}
