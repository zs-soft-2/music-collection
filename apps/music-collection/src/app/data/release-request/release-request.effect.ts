import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	DiscogsVersion,
	ReleaseRequest,
	ReleaseRequestAdd,
} from '@music-collection/api';

import { ReleaseRequestRepository } from './release-request.repository';

/**
 * Release requests of the signed-in collector and the Discogs pressings they
 * pick from.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRequestEffect {
	private readonly repository = inject(ReleaseRequestRepository);

	/** The user's requests, newest first; emits again when they change. */
	public listByUser$(userId: string): Observable<ReleaseRequest[]> {
		return this.repository
			.listByUser$(userId)
			.pipe(
				map((requests) =>
					[...requests].sort((a, b) => b.createdAt - a.createdAt)
				)
			);
	}

	public request$(request: ReleaseRequestAdd): Observable<ReleaseRequest> {
		return this.repository.add$(request);
	}

	public listDiscogsVersions$(
		masterId: number
	): Observable<DiscogsVersion[]> {
		return this.repository.listDiscogsVersions$(masterId);
	}
}
