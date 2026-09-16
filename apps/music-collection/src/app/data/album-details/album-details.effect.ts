import { Observable, forkJoin, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ContributionEntity, TrackEntity } from '@music-collection/api';

import { AlbumDetailsRepository } from './album-details.repository';

export interface AlbumDetails {
	/** Tracks in play order. */
	tracks: TrackEntity[];
	contributions: ContributionEntity[];
}

/** Loads the tracklist and the credits of an album together. */
@Injectable({ providedIn: 'root' })
export class AlbumDetailsEffect {
	private readonly repository = inject(AlbumDetailsRepository);

	public load$(albumUid: string): Observable<AlbumDetails> {
		return forkJoin({
			tracks: this.repository.listTracks$(albumUid),
			contributions: this.repository.listContributions$(albumUid),
		}).pipe(
			map(({ tracks, contributions }) => ({
				tracks: [...tracks].sort((a, b) => a.index - b.index),
				contributions,
			}))
		);
	}
}
