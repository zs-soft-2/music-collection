import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity, AlbumEntityAdd, AlbumEntityUpdate } from './album';
import { ReleaseTrackDraft, TrackEntity } from '../track';
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
	 * links) by play order, surplus tracks are deleted.
	 */
	public abstract saveTracks(
		albumUid: string,
		tracks: AlbumExternalTrack[],
		existing: TrackEntity[]
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
