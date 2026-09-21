import { Observable, combineLatest, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { TrackEntity } from '@music-collection/api';

import { TrackStatsRepository } from './track-stats.repository';

/** How much of the catalog's track data is filled in. */
export interface TrackStats {
	total: number;
	/** Uids of the albums that have at least one track. */
	albumUids: ReadonlySet<string>;
	/** Null when the lyrics could not be counted. */
	withLyrics: number | null;
	withSpotify: number;
	withYoutube: number;
}

const toStats = (
	tracks: TrackEntity[],
	withLyrics: number | null
): TrackStats => ({
	total: tracks.length,
	albumUids: new Set(tracks.map((track) => track.albumUid)),
	withLyrics,
	withSpotify: tracks.filter((track) => !!track.spotifyTrackId).length,
	withYoutube: tracks.filter((track) => !!track.youtubeVideoId).length,
});

/**
 * Loads the track data of the catalog and folds it into counts, so the whole
 * tracklist never reaches the store.
 */
@Injectable({ providedIn: 'root' })
export class TrackStatsEffect {
	private readonly repository = inject(TrackStatsRepository);

	public load$(): Observable<TrackStats> {
		return combineLatest([
			this.repository.list$(),
			this.repository.lyricsCount$(),
		]).pipe(map(([tracks, withLyrics]) => toStats(tracks, withLyrics)));
	}
}
