import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from './album';
import { TrackEntity } from '../track';
import {
	AlbumExternalProfile,
	AlbumExternalTrack,
	AlbumExternalTracks,
} from './album-external';

export abstract class AlbumDataService extends FirebaseDataService<
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate
> {
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
}
