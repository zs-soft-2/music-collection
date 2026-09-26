import { Observable, map, tap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AnalyticsService,
	ApproveReleaseRequestResult,
	DiscogsVersion,
	GenericReleaseMedia,
	ReleaseEntity,
	ReleaseRequest,
	ReleaseRequestAdd,
	User,
} from '@music-collection/api';

import { ReleaseRequestRepository } from './release-request.repository';

const newestFirst = (requests: ReleaseRequest[]) =>
	[...requests].sort((a, b) => b.createdAt - a.createdAt);

/**
 * Release requests: the collector's own and the Discogs pressings they pick
 * from; for the admin all of them with the approval and rejection.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRequestEffect {
	private readonly repository = inject(ReleaseRequestRepository);
	private readonly analytics = inject(AnalyticsService);

	/** The user's requests, newest first; emits again when they change. */
	public listByUser$(userId: string): Observable<ReleaseRequest[]> {
		return this.repository.listByUser$(userId).pipe(map(newestFirst));
	}

	/** Every request, newest first (admin). */
	public listAll$(): Observable<ReleaseRequest[]> {
		return this.repository.listAll$().pipe(map(newestFirst));
	}

	/** How many requests wait for a decision (admin). */
	public countPending$(): Observable<number> {
		return this.repository
			.listAll$()
			.pipe(
				map(
					(requests) =>
						requests.filter(
							(request) => request.status === 'pending'
						).length
				)
			);
	}

	public listUsers$(): Observable<User[]> {
		return this.repository.listUsers$();
	}

	/**
	 * Approves the request: with `releaseUid` that catalog release of the
	 * album, without it the requested Discogs release, imported.
	 */
	public approve$(
		requestId: string,
		releaseUid: string | null
	): Observable<ApproveReleaseRequestResult> {
		return this.repository.approve$({ requestId, releaseUid });
	}

	/**
	 * The album's generic release on the medium, ready to embed in a copy —
	 * the one other collectors of it already share, or a new one.
	 */
	public ensureGenericRelease$(
		artistUid: string,
		albumUid: string,
		media: GenericReleaseMedia
	): Observable<ReleaseEntity> {
		return this.repository
			.ensureGenericRelease$({ artistUid, albumUid, media })
			.pipe(
				map(
					({ release }) =>
						({
							...release,
							// An undated album leaves the release undated too,
							// rather than dated 1970.
							date:
								release.date === null
									? null
									: new Date(release.date),
						}) as ReleaseEntity
				)
			);
	}

	public reject$(
		requestId: string,
		adminNote: string | null,
		adminUid: string
	): Observable<void> {
		return this.repository.reject$(requestId, adminNote, adminUid);
	}

	public request$(request: ReleaseRequestAdd): Observable<ReleaseRequest> {
		return this.repository.add$(request).pipe(
			// Whether they picked a pressing off the Discogs versions or just
			// asked for the album: the two are different amounts of work for
			// whoever approves it, and we cannot tell which one collectors
			// actually do without counting.
			tap((created) =>
				this.analytics.track('release_requested', {
					pressing: !!created.discogsReleaseId,
				})
			)
		);
	}

	public listDiscogsVersions$(
		masterId: number
	): Observable<DiscogsVersion[]> {
		return this.repository.listDiscogsVersions$(masterId);
	}
}
