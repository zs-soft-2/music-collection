import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from '../album';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from '../release';
import { ArtistModel, ArtistModelAdd, ArtistModelUpdate } from './artist';
import {
	ArtistExternalAlbum,
	ArtistExternalCandidate,
	ArtistExternalProfile,
	ArtistExternalQuery,
} from './artist-external';

export abstract class ArtistDataService extends FirebaseDataService<
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate
> {
	public abstract addAlbum$(album: AlbumModelAdd): Observable<AlbumModel>;
	public abstract addRelease$(
		release: ReleaseModelAdd
	): Observable<ReleaseModel>;
	public abstract deleteRelease$(
		release: ReleaseModel
	): Observable<ReleaseModel>;
	/** The artist's albums found online by name, country and styles. */
	public abstract fetchExternalAlbums$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalAlbum[]>;
	/** Looks the artist up online by name, country and styles; null when not found. */
	public abstract fetchExternalProfile$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalProfile | null>;
	public abstract importAlbum$(album: AlbumModel): Observable<AlbumModel>;
	public abstract listAlbumsById$(uid: string): Observable<AlbumModel[]>;
	/** The artists of the searched name found online, the best fit first. */
	public abstract searchExternalArtists$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalCandidate[]>;
	public abstract updateAlbum$(
		album: AlbumModelUpdate
	): Observable<AlbumModelUpdate>;
	public abstract updateRelease$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate>;
}
