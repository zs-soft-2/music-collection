import { Observable, defer, retry, switchMap, throwError, timer } from 'rxjs';

import {
	HttpClient,
	HttpErrorResponse,
	HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export const MUSICBRAINZ_URL = 'https://musicbrainz.org/ws/2';
/** MusicBrainz allows one request per second per IP. */
export const MUSICBRAINZ_INTERVAL_MS = 1100;

/**
 * GETs on the MusicBrainz API within its rate limit (1 request / second
 * per IP), shared by the whole app; a 503 (limit exceeded or server busy)
 * is retried after a growing pause.
 */
@Injectable({ providedIn: 'root' })
export class MusicBrainzClient {
	private http = inject(HttpClient);

	/** When the next request may start. */
	private nextSlot = 0;

	public get$<T>(path: string, params: HttpParams): Observable<T> {
		return defer(() => {
			const now = Date.now();
			const wait = Math.max(0, this.nextSlot - now);
			this.nextSlot = now + wait + MUSICBRAINZ_INTERVAL_MS;

			return timer(wait).pipe(
				switchMap(() =>
					this.http.get<T>(`${MUSICBRAINZ_URL}${path}`, { params })
				)
			);
		}).pipe(
			retry({
				count: 4,
				delay: (error, attempt) =>
					error instanceof HttpErrorResponse && error.status === 503
						? timer(attempt * 2000)
						: throwError(() => error),
			})
		);
	}
}
