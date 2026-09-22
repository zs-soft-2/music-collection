import { Observable, combineLatest, map, of } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ContributionEntity, TrackEntity } from '@music-collection/api';

import { AlbumDetailsRepository } from './album-details.repository';

export interface AlbumDetails {
	/** Tracks in play order. */
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
}

/**
 * Loads the tracklist and the credits of an album together; emits again when
 * either changes.
 */
@Injectable({ providedIn: 'root' })
export class AlbumDetailsEffect {
	private readonly repository = inject(AlbumDetailsRepository);

	/**
	 * The album as such: the tracks every pressing of it plays. What one
	 * pressing added is left out here — it belongs to that release, and the
	 * album page would otherwise promise a bonus cut this record may not
	 * have.
	 */
	public load$(albumUid: string): Observable<AlbumDetails> {
		return combineLatest({
			tracks: this.repository.listTracks$(albumUid),
			contributions: this.repository.listContributions$(albumUid),
		}).pipe(
			map(({ tracks, contributions }) => ({
				tracks: sortByIndex(
					tracks.filter((track) => !track.releaseUid)
				),
				contributions,
			}))
		);
	}

	/**
	 * What a copy of one pressing plays: the album's own tracks and the ones
	 * this release added, in one list. The credits stay the album's — a bonus
	 * track is credited there like any other.
	 *
	 * The album query answers with every track carrying the album, which
	 * includes what *other* pressings added; those are dropped. A Japanese
	 * edition's tenth song is on the Japanese copy and on no other.
	 */
	public loadCopy$(
		albumUid: string,
		releaseUid: string | null
	): Observable<AlbumDetails> {
		return combineLatest({
			tracks: this.repository.listTracks$(albumUid),
			extra: releaseUid
				? this.repository.listTracksByRelease$(releaseUid)
				: of([] as TrackEntity[]),
			contributions: this.repository.listContributions$(albumUid),
		}).pipe(
			map(({ tracks, extra, contributions }) => ({
				tracks: sortByIndex([
					...tracks.filter((track) => !track.releaseUid),
					...extra,
				]),
				contributions,
			}))
		);
	}
}

function sortByIndex(tracks: TrackEntity[]): TrackEntity[] {
	return [...tracks].sort((a, b) => a.index - b.index);
}
