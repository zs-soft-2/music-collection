import { Observable, switchMap, throwError } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AlbumDeletionRepository,
	AlbumEntity,
	EntityUsage,
	isDeletable,
} from '@music-collection/api';

/**
 * An album another collector owns a copy of cannot be deleted. The page has
 * a sentence of its own for this error.
 */
export const ALBUM_IN_USE = 'album-in-use';

/**
 * Taking an album off the catalog, and the rule that governs it.
 *
 * Unlike a pressing, an album is often deleted because it was filed under
 * the wrong artist — and then the copy standing on a shelf is usually the
 * deleting admin's own. Those copies do not stop the delete: they go with
 * the album, and the dialog says so before the click. Another collector's
 * copy does stop it — that is their shelf, not ours to tidy.
 */
@Injectable()
export class AlbumDeletionEffect {
	private readonly repository = inject(AlbumDeletionRepository);

	/** What holds the album, for the dialog that asks before deleting. */
	public usage$(album: AlbumEntity): Observable<EntityUsage> {
		return this.repository.usage$(album);
	}

	/**
	 * Deletes the album, or refuses with `ALBUM_IN_USE`. The usage is read
	 * again rather than taken from what the dialog was drawn with.
	 */
	public delete$(album: AlbumEntity): Observable<void> {
		return this.repository
			.usage$(album)
			.pipe(
				switchMap((usage) =>
					isDeletable(usage)
						? this.repository.delete$(album)
						: throwError(() => new Error(ALBUM_IN_USE))
				)
			);
	}
}
