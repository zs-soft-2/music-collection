import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity, AlbumEntityAdd, AlbumEntityUpdate } from './album';
import { ExternalSource } from '../external';
import { AlbumTrackDraft, ReleaseTrackDraft, TrackEntity } from '../track';
import {
	AlbumExternalProfile,
	AlbumExternalTrack,
	AlbumExternalTracks,
} from './album-external';

export abstract class AlbumStateService extends EntityStateService<
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	/** Looks the album of the artist up online; null when not found. */
	public abstract fetchExternalProfile$(
		artistName: string,
		name: string
	): Observable<AlbumExternalProfile | null>;
	/** The album's tracklist found online; null when not found. */
	public abstract fetchExternalTracks$(
		artistName: string,
		name: string
	): Observable<AlbumExternalTracks | null>;
	/** The album's tracks (`track` collection) in play order. */
	public abstract listTracks$(albumUid: string): Observable<TrackEntity[]>;
	/**
	 * Replaces the album's tracklist: tracks keep their id (and hand-added
	 * links) by play order, surplus tracks are deleted. The source is written
	 * on every track, so a reload can tell where the list came from.
	 */
	public abstract saveTracks(
		albumUid: string,
		tracks: AlbumExternalTrack[],
		existing: TrackEntity[],
		source: ExternalSource
	): Promise<void>;
	/**
	 * Writes one track of the album by hand: a corrected title, a missing
	 * length. Only the fields on the form are touched, so the links, the
	 * writers and the credits of the track stay as they are.
	 */
	public abstract saveAlbumTrack(track: AlbumTrackDraft): Promise<void>;
	/**
	 * Takes one track off the album, with its lyrics, and closes the gap in
	 * play order behind it. `albumTracks` is the album's own list as it
	 * stands, in play order.
	 */
	public abstract deleteAlbumTrack(
		uid: string,
		albumTracks: TrackEntity[]
	): Promise<void>;
	/** The tracks one pressing added, in play order. */
	public abstract listReleaseTracks$(
		releaseUid: string
	): Observable<TrackEntity[]>;
	/** Writes one track of a pressing — a new one, or an edited one. */
	public abstract saveReleaseTrack(track: ReleaseTrackDraft): Promise<void>;
	/** Takes a pressing's track back off the album. */
	public abstract deleteReleaseTrack(uid: string): Promise<void>;
	public abstract dispatchSelectAlbumAction(album: AlbumEntity): void;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<AlbumEntity[]>;
}
