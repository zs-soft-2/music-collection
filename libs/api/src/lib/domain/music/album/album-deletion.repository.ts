import { Observable } from 'rxjs';

import { EntityUsage } from '../../../common';
import { AlbumEntity } from './album';

/**
 * Taking an album off the catalog. Data access only: what may be deleted is
 * decided in `AlbumDeletionEffect`, and decided again on the server — this
 * is how the two questions are asked.
 */
export abstract class AlbumDeletionRepository {
	/**
	 * What holds the album: other collectors' copies of its pressings
	 * (blocking); its pressings, its tracks and the caller's own copies
	 * (cascading — they go with it, and the dialog says how many).
	 *
	 * Asked of the server rather than of the cached catalog: a copy on
	 * somebody else's shelf was never downloaded here.
	 */
	public abstract usage$(album: AlbumEntity): Observable<EntityUsage>;

	/**
	 * Deletes the album with everything filed under it. The server checks
	 * the holds again inside a transaction, and refuses an album that
	 * another collector owns a copy of, or has rated.
	 */
	public abstract delete$(album: AlbumEntity): Observable<void>;
}
