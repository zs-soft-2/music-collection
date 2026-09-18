import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from '../album';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from '../release';
import { ArtistModel, ArtistModelAdd, ArtistModelUpdate } from './artist';
import { ArtistExternalAlbum, ArtistExternalProfile } from './artist-external';

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
	/** The artist's albums found online by the artist's name. */
	public abstract fetchExternalAlbums$(
		name: string
	): Observable<ArtistExternalAlbum[]>;
	/** Looks the artist up online by name; null when not found. */
	public abstract fetchExternalProfile$(
		name: string
	): Observable<ArtistExternalProfile | null>;
	public abstract importAlbum$(album: AlbumModel): Observable<AlbumModel>;
	public abstract listAlbumsById$(uid: string): Observable<AlbumModel[]>;
	public abstract updateAlbum$(
		album: AlbumModelUpdate
	): Observable<AlbumModelUpdate>;
	public abstract updateRelease$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate>;
}
