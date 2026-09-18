import { Observable, firstValueFrom, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
	AlbumEntity,
	AlbumExternalTracks,
	AlbumStateService,
	TrackEntity,
} from '@music-collection/api';

export interface AlbumTracksParams {
	album: AlbumEntity | undefined;
	/** The album's tracks (`track` collection) in play order. */
	tracks: TrackEntity[];
}

@Injectable()
export class AlbumTracksService {
	private albumStateService = inject(AlbumStateService);

	private params: AlbumTracksParams = { album: undefined, tracks: [] };

	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);
	public readonly saving = signal(false);
	public readonly externalTracks = signal<AlbumExternalTracks | null>(null);

	public init$(albumId: string): Observable<AlbumTracksParams> {
		if (!albumId) {
			return of(this.params);
		}

		return this.albumStateService.selectEntityById$(albumId).pipe(
			switchMap((album) =>
				this.albumStateService.listTracks$(albumId).pipe(
					map((tracks) => {
						this.params = { album, tracks };

						return this.params;
					})
				)
			)
		);
	}

	/**
	 * Saves the loaded tracklist as the album's `track` documents; existing
	 * tracks keep their id, links and lyrics by play order.
	 */
	public async applyExternal(): Promise<void> {
		const album = this.params.album;
		const external = this.externalTracks();
		if (!album || !external || this.saving()) {
			return;
		}
		this.saving.set(true);
		this.externalError.set(null);
		try {
			await this.albumStateService.saveTracks(
				album.uid,
				external.tracks,
				this.params.tracks
			);
			this.externalTracks.set(null);
		} catch (error) {
			console.error(error);
			this.externalError.set('Saving tracks failed.');
		} finally {
			this.saving.set(false);
		}
	}

	public closeExternal(): void {
		this.externalTracks.set(null);
	}

	/** Looks the album's tracklist up online by its title and artist. */
	public async loadExternal(): Promise<void> {
		const album = this.params.album;
		const name = album?.name?.trim();
		const artistName = album?.artist?.name?.trim();
		if (!name || !artistName || this.externalLoading()) {
			return;
		}
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			const tracks = await firstValueFrom(
				this.albumStateService.fetchExternalTracks$(artistName, name)
			);
			if (tracks?.tracks.length) {
				this.externalTracks.set(tracks);
			} else {
				this.externalError.set(
					`No tracks found for "${artistName} – ${name}".`
				);
			}
		} catch (error) {
			console.error(error);
			this.externalError.set(
				error instanceof HttpErrorResponse && error.status === 503
					? 'MusicBrainz is busy right now, try again in a few seconds.'
					: 'Loading tracks failed.'
			);
		} finally {
			this.externalLoading.set(false);
		}
	}
}
