import { Observable } from 'rxjs';

import { EntityUsage } from '../../../common';
import { ReleaseEntity } from './release';

/**
 * Taking a pressing off the catalog. Data access only: what may be deleted
 * is decided in `ReleaseDeletionEffect`, and decided again on the server —
 * this is how the two questions are asked.
 */
export abstract class ReleaseDeletionRepository {
	/**
	 * What holds the pressing: other collectors' copies and undecided
	 * requests (blocking), its own tracks and serial claims (cascading).
	 *
	 * Asked of the server rather than of the cached catalog: a copy on
	 * somebody else's shelf was never downloaded here, and the answer has to
	 * be current — it is what the delete turns on.
	 */
	public abstract usage$(release: ReleaseEntity): Observable<EntityUsage>;

	/**
	 * Deletes the pressing with everything filed under it. The server checks
	 * the holds again inside a transaction and refuses a release that was
	 * taken up between the reading and the click.
	 */
	public abstract delete$(release: ReleaseEntity): Observable<void>;

	/**
	 * Takes the pressing off the forms without touching what is saved, or
	 * puts it back. This is the answer to a release that cannot be deleted.
	 */
	public abstract archive$(
		release: ReleaseEntity,
		archived: boolean
	): Observable<void>;
}
