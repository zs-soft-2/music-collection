import { Observable, map, tap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AnalyticsService,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
} from '@music-collection/api';

import { OwnedArtistRepository } from './owned-artist.repository';

const byName = (artists: ArtistModel[]) =>
	[...artists].sort((a, b) => a.name.localeCompare(b.name));

/**
 * The bands a collector keeps for themselves: the ones the catalog has never
 * heard of, so a record by them has something to stand under.
 *
 * They are the collector's own in every sense — nobody else reads them, they
 * count towards no score and no statistic. A band earns its place in the
 * catalog by being approved, not by being written here.
 */
@Injectable({ providedIn: 'root' })
export class OwnedArtistEffect {
	private readonly analytics = inject(AnalyticsService);
	private readonly repository = inject(OwnedArtistRepository);

	/** The collector's own bands, by name; empty for a visitor. */
	public list$(): Observable<ArtistModel[]> {
		return this.repository.list$().pipe(map(byName));
	}

	public add$(artist: ArtistModelAdd): Observable<ArtistModel> {
		return this.repository
			.add$(artist)
			.pipe(tap(() => this.analytics.track('owned_artist_added')));
	}

	public remove$(artist: ArtistModel): Observable<ArtistModel> {
		return this.repository.delete$(artist);
	}

	public update$(artist: ArtistModelUpdate): Observable<ArtistModelUpdate> {
		return this.repository.update$(artist);
	}
}
