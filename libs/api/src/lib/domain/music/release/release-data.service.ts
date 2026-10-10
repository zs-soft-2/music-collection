import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import { DiscogsVersion } from '../release-request';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from './release';

export abstract class ReleaseDataService extends FirebaseDataService<
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate
> {
	/**
	 * The Discogs master of the album, for the pressings to be listed off;
	 * null when Discogs has no master of that album.
	 */
	public abstract findExternalMaster$(
		artistName: string,
		albumName: string
	): Observable<number | null>;
	/** The pressings of a Discogs master. */
	public abstract listExternalVersions$(
		masterId: number
	): Observable<DiscogsVersion[]>;
}
