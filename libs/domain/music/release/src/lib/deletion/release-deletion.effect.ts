import { Observable, switchMap, throwError } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	EntityUsage,
	ReleaseDeletionRepository,
	ReleaseEntity,
	isDeletable,
} from '@music-collection/api';

/**
 * A pressing somebody owns a copy of cannot be deleted; it is archived
 * instead. The page has a sentence of its own for this error.
 */
export const RELEASE_IN_USE = 'release-in-use';

/**
 * Taking a pressing off the catalog, and the rule that governs it.
 *
 * A release is not the collector's copy, and the two are undone in
 * different ways. Selling a record or filing it by mistake is the
 * collector's business: the copy goes, the pressing stays, because everyone
 * else's copies still point at it. Deleting the pressing is the catalog's
 * business, and it is only allowed once no copy is left anywhere — the
 * copies carry the release whole, and a deleted one would leave them
 * pointing at nothing, with nothing on the client able to put it back.
 *
 * Where that is the case, the pressing is archived instead: off the forms,
 * so no new copy joins it, but there for the copies that are already filed
 * under it.
 */
@Injectable()
export class ReleaseDeletionEffect {
	private readonly repository = inject(ReleaseDeletionRepository);

	/** What holds the pressing, for the page that asks before deleting. */
	public usage$(release: ReleaseEntity): Observable<EntityUsage> {
		return this.repository.usage$(release);
	}

	/**
	 * Deletes the pressing, or refuses with `RELEASE_IN_USE`.
	 *
	 * The usage is read again here rather than taken from what the dialog
	 * was drawn with: a page can stand open for a long time, and a copy
	 * filed in the meantime is exactly the case this refuses.
	 */
	public delete$(release: ReleaseEntity): Observable<void> {
		return this.repository
			.usage$(release)
			.pipe(
				switchMap((usage) =>
					isDeletable(usage)
						? this.repository.delete$(release)
						: throwError(() => new Error(RELEASE_IN_USE))
				)
			);
	}

	/** Takes the pressing off the forms, or puts it back. */
	public archive$(
		release: ReleaseEntity,
		archived: boolean
	): Observable<void> {
		return this.repository.archive$(release, archived);
	}
}
