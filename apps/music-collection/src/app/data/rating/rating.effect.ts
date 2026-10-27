import { Observable, shareReplay } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { AlbumRatingSummary } from './community-rating.model';
import {
	AlbumRating,
	RatedAlbum,
	RatingDraft,
	isValidStars,
	toRating,
} from './rating.model';
import { RatingRepository } from './rating.repository';

/**
 * What the collector thinks of their records: giving a verdict, taking it
 * back, and reading them all. The list is shared, so the album page, the
 * shelf, the player and the profile read one cached set of ratings rather
 * than a query each.
 */
@Injectable({ providedIn: 'root' })
export class RatingEffect {
	private readonly repository = inject(RatingRepository);

	private readonly ratings$ = this.repository
		.list$()
		.pipe(shareReplay({ bufferSize: 1, refCount: true }));

	/**
	 * Everybody's stars per album, one stream per record. Kept so that the
	 * album page and anything else asking about the same record share a
	 * single document read.
	 */
	private readonly summaries = new Map<
		string,
		Observable<AlbumRatingSummary | null>
	>();

	public list$(): Observable<AlbumRating[]> {
		return this.ratings$;
	}

	/**
	 * Keeps a verdict. Stars off the scale are refused here rather than
	 * carried to the rules, which would refuse them too: a rating is worth
	 * nothing if it cannot be compared with the next one.
	 */
	public rate(album: RatedAlbum, draft: RatingDraft): Promise<void> {
		if (!isValidStars(draft.stars)) {
			return Promise.reject(
				new Error(`Not a star a collector can give: ${draft.stars}`)
			);
		}

		return this.repository.save(toRating(album, draft));
	}

	/** Leaves the record unjudged again. */
	public clear(albumId: string): Promise<void> {
		return this.repository.remove(albumId);
	}

	/** What everybody together said about one record. */
	public summary$(albumId: string): Observable<AlbumRatingSummary | null> {
		const held = this.summaries.get(albumId);

		if (held) {
			return held;
		}

		const summary$ = this.repository
			.summary$(albumId)
			.pipe(shareReplay({ bufferSize: 1, refCount: false }));

		this.summaries.set(albumId, summary$);

		return summary$;
	}

	/** Whether a verdict would be kept. */
	public get rating(): boolean {
		return this.repository.signedIn;
	}
}
