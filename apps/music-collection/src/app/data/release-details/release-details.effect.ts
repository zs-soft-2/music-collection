import {
	Observable,
	catchError,
	combineLatest,
	of,
	startWith,
	switchMap,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ReleaseEntity, ReleaseRarity } from '@music-collection/api';
import { RarityTier } from '@music-collection/common/api';

import { ReleaseRepository } from './release.repository';
import { ReleaseRarityRepository } from './release-rarity.repository';

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
	private readonly rarityRepository = inject(ReleaseRarityRepository);

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

	/**
	 * A curator's own tier for the pressing, or — with `null` — taking it
	 * back so the sources decide again. Answers with the tier that now holds.
	 */
	public overrideRarity$(
		releaseUid: string,
		tier: RarityTier | null,
		note: string
	): Observable<ReleaseRarity> {
		return this.rarityRepository.override$(releaseUid, tier, note);
	}

	/** Works the pressing's tier out again now. */
	public refreshRarity$(releaseUid: string): Observable<ReleaseRarity> {
		return this.rarityRepository.refresh$(releaseUid);
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
