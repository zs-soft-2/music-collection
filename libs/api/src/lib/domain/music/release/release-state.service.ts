import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { DiscogsVersion } from '../release-request';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
} from './release';

export abstract class ReleaseStateService extends EntityStateService<
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
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
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<ReleaseEntity[]>;
}
