import {
	BehaviorSubject,
	Observable,
	combineLatest,
	firstValueFrom,
	of,
} from 'rxjs';
import { map } from 'rxjs/operators';

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
	/** The album's own tracks (`track` collection) in play order. */
	tracks: TrackEntity[];
}

@Injectable()
export class AlbumTracksService {
	private albumStateService = inject(AlbumStateService);

	private params: AlbumTracksParams = { album: undefined, tracks: [] };
	/**
	 * Tracks added here that the list has not read back yet. The catalog sync
	 * takes a couple of seconds to come round, and a tracklist is typed in
	 * faster than that: until it carries them, the form does, so a second
	 * track is numbered after the first rather than over it.
	 */
	private readonly pending$ = new BehaviorSubject<TrackEntity[]>([]);

	public readonly error = signal<string | null>(null);
	/** The track the form is asking about before it deletes it. */
	public readonly removing = signal<TrackEntity | null>(null);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);
	public readonly saving = signal(false);
	public readonly externalTracks = signal<AlbumExternalTracks | null>(null);

	public init$(albumId: string): Observable<AlbumTracksParams> {
		if (!albumId) {
			return of(this.params);
		}

		return combineLatest([
			this.albumStateService.selectEntityById$(albumId),
			this.albumStateService.listTracks$(albumId),
			this.pending$,
		]).pipe(
			map(([album, tracks, pending]) => {
				// What one pressing added is a track of the album too, and
				// comes back with this list. It is edited on that pressing's
				// form, not here — and it must stay out of the count this
				// form's Load button offers to replace.
				const albumTracks = tracks.filter((track) => !track.releaseUid);
				const known = new Set(albumTracks.map((track) => track.uid));
				const waiting = pending.filter(
					(track) => !known.has(track.uid)
				);

				this.params = {
					album,
					tracks: [...albumTracks, ...waiting],
				};

				// What the list has caught up with is the list's again.
				if (waiting.length !== pending.length) {
					this.pending$.next(waiting);
				}

				return this.params;
			})
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
				this.params.tracks,
				external.source
			);
			// The loaded list is the album's tracklist now, surplus deleted
			// and all: nothing is waiting to be read back any more.
			this.pending$.next([]);
			this.externalTracks.set(null);
		} catch (error) {
			console.error(error);
			this.externalError.set('Saving tracks failed.');
		} finally {
			this.saving.set(false);
		}
	}

	/** Writes one track of the album: a corrected title, a missing length. */
	public async save(draft: {
		uid: string;
		index: number;
		position: string;
		name: string;
		duration: string;
	}): Promise<boolean> {
		if (!draft.name.trim() || this.saving()) {
			return false;
		}
		this.saving.set(true);
		this.error.set(null);

		try {
			await this.albumStateService.saveAlbumTrack({
				uid: draft.uid,
				index: draft.index,
				position: draft.position.trim() || String(draft.index),
				name: draft.name.trim(),
				duration: draft.duration.trim() || null,
			});

			return true;
		} catch (error) {
			console.error(error);
			this.error.set('Saving the track failed.');

			return false;
		} finally {
			this.saving.set(false);
		}
	}

	/**
	 * Adds a track to the album by hand, for a record no import lists. Where
	 * it lands and what id it gets is the album's to decide, so only what was
	 * typed is passed on.
	 */
	public async add(draft: {
		position: string;
		name: string;
		duration: string;
	}): Promise<boolean> {
		const album = this.params.album;

		if (!album || !draft.name.trim() || this.saving()) {
			return false;
		}
		this.saving.set(true);
		this.error.set(null);

		try {
			const added = await this.albumStateService.addAlbumTrack(
				{
					albumUid: album.uid,
					position: draft.position.trim() || null,
					name: draft.name.trim(),
					duration: draft.duration.trim() || null,
				},
				this.params.tracks
			);

			this.pending$.next([...this.pending$.value, added]);

			return true;
		} catch (error) {
			console.error(error);
			this.error.set('Adding the track failed.');

			return false;
		} finally {
			this.saving.set(false);
		}
	}

	/**
	 * Asks before deleting. Reloading the tracklist brings a deleted track
	 * back, but not the lyrics written under it, so this is one of the few
	 * things on the album form that cannot be undone by loading it again.
	 */
	public askRemove(track: TrackEntity): void {
		this.error.set(null);
		this.removing.set(track);
	}

	public cancelRemove(): void {
		this.removing.set(null);
	}

	/** Takes one track off the album, with its lyrics. */
	public async confirmRemove(): Promise<void> {
		const track = this.removing();

		if (!track || this.saving()) {
			return;
		}
		this.saving.set(true);
		this.error.set(null);

		try {
			await this.albumStateService.deleteAlbumTrack(
				track.uid,
				this.params.tracks
			);
			// A track the list is still waiting for can be deleted before it
			// ever arrives, and then nothing is coming.
			this.pending$.next(
				this.pending$.value.filter(
					(waiting) => waiting.uid !== track.uid
				)
			);
			this.removing.set(null);
		} catch (error) {
			console.error(error);
			this.error.set('Removing the track failed.');
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
