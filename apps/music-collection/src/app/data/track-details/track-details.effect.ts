import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { TrackLyrics } from '@music-collection/api';

import {
	LyricsQuery,
	TrackDetailsRepository,
	TrackLinksUpdate,
} from './track-details.repository';

export interface TrackDetailsUpdate extends TrackLinksUpdate {
	lyrics: TrackLyrics;
}

/** Loads and saves the hand-edited details of a track. */
@Injectable({ providedIn: 'root' })
export class TrackDetailsEffect {
	private readonly repository = inject(TrackDetailsRepository);

	public lyrics$(trackUid: string): Observable<TrackLyrics | null> {
		return this.repository.lyrics$(trackUid);
	}

	/** Finds the lyrics online; nothing is saved. */
	public fetchExternalLyrics$(
		query: LyricsQuery
	): Observable<TrackLyrics | null> {
		return this.repository.fetchExternalLyrics$(query);
	}

	/** Writes the lyrics only when they changed. */
	public async save(
		trackUid: string,
		{ lyrics, ...links }: TrackDetailsUpdate,
		previousLyrics: TrackLyrics | null
	): Promise<void> {
		await this.repository.updateTrack(trackUid, links);
		if (
			lyrics.text.trim() !== (previousLyrics?.text ?? '').trim() ||
			(lyrics.synced ?? '').trim() !==
				(previousLyrics?.synced ?? '').trim()
		) {
			await this.repository.saveLyrics(trackUid, lyrics);
		}
	}
}
