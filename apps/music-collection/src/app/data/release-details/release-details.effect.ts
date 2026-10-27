import {
	Observable,
	catchError,
	combineLatest,
	of,
	startWith,
	switchMap,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ReleaseEntity } from '@music-collection/api';

import { ReleaseRepository } from './release.repository';

export interface ReleaseDetails {
	release: ReleaseEntity | null;
	/**
	 * The other pressings of the same album, this one among them: a record
	 * is best read next to its siblings — the first press, the reissue, the
	 * edition that came out elsewhere.
	 */
	pressings: ReleaseEntity[];
}

/**
 * Loads a pressing and the family it belongs to; emits again when either
 * changes. The pressing is what the page waits for — its siblings join it
 * once they are read, and their absence never holds the page back.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseDetailsEffect {
	private readonly repository = inject(ReleaseRepository);

	public load$(releaseUid: string): Observable<ReleaseDetails> {
		return this.repository.get$(releaseUid).pipe(
			switchMap((release) =>
				release?.album?.uid
					? combineLatest({
							release: of(release),
							pressings: this.pressingsOf$(release.album.uid),
						})
					: of({ release, pressings: [] as ReleaseEntity[] })
			)
		);
	}

	/** The pressings of an album — what a wish could be satisfied with. */
	public pressingsOf$(albumUid: string): Observable<ReleaseEntity[]> {
		return this.repository.listByAlbum$(albumUid).pipe(
			catchError((error) => {
				console.error(error);

				return of([] as ReleaseEntity[]);
			}),
			startWith([] as ReleaseEntity[])
		);
	}
}
