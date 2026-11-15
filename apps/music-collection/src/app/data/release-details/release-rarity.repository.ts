import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { ReleaseRarity } from '@music-collection/api';
import { RarityTier } from '@music-collection/common/api';

/** See `apps/functions/src/release-rarity.functions.ts`. */
export const SET_RELEASE_RARITY_OVERRIDE_FUNCTION = 'setReleaseRarityOverride';
export const REFRESH_RELEASE_RARITY_FUNCTION = 'refreshReleaseRarityNow';

interface RarityResult {
	uid: string;
	rarity: ReleaseRarity;
}

/**
 * The rarity of a pressing, where a curator has a say in it.
 *
 * Both calls go to the server because the tier is the server's to write: a
 * collector's score hangs on it, and the rules refuse a client that sets it.
 */
@Injectable({ providedIn: 'root' })
export class ReleaseRarityRepository {
	private readonly functions = inject(Functions);

	/** The curator's own tier with the reason for it; null takes it back. */
	public override$(
		releaseUid: string,
		tier: RarityTier | null,
		note: string
	): Observable<ReleaseRarity> {
		const callable = httpsCallable<
			{ uid: string; tier: RarityTier | null; note: string },
			RarityResult
		>(this.functions, SET_RELEASE_RARITY_OVERRIDE_FUNCTION);

		return from(callable({ uid: releaseUid, tier, note })).pipe(
			map(({ data }) => data.rarity)
		);
	}

	/** Works the tier out again now rather than on the nightly round. */
	public refresh$(releaseUid: string): Observable<ReleaseRarity> {
		const callable = httpsCallable<{ uid: string }, RarityResult>(
			this.functions,
			REFRESH_RELEASE_RARITY_FUNCTION
		);

		return from(callable({ uid: releaseUid })).pipe(
			map(({ data }) => data.rarity)
		);
	}
}
