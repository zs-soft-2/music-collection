import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../../core';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from '../album';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from '../release';
import { ArtistModel, ArtistModelAdd, ArtistModelUpdate } from './artist';

export abstract class ArtistDataService extends FirebaseDataService<
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate
> {
	public abstract addAlbum$(album: AlbumModelAdd): Observable<AlbumModel>;
	public abstract addRelease$(
		release: ReleaseModelAdd
	): Observable<ReleaseModel>;
	public abstract importAlbum$(album: AlbumModel): Observable<AlbumModel>;
	public abstract listAlbumsById$(uid: string): Observable<AlbumModel[]>;
	public abstract updateAlbum$(
		album: AlbumModelUpdate
	): Observable<AlbumModelUpdate>;
	public abstract updateRelease$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate>;
}
