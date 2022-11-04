import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from '../album';
import { ReleaseModel, ReleaseModelAdd, ReleaseModelUpdate } from '../release';
import { ArtistModel, ArtistModelAdd, ArtistModelUpdate } from './artist';

export abstract class ArtistDataService extends EntityDataService<
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate
> {
	public abstract addAlbum$(album: AlbumModelAdd): Observable<AlbumModel>;
	public abstract addRelease$(
		release: ReleaseModelAdd
	): Observable<ReleaseModel>;
	public abstract listByIds$(ids: string[]): Observable<ArtistModel[]>;
	public abstract search$(query: string): Observable<ArtistModel[]>;
	public abstract updateAlbum$(
		album: AlbumModelUpdate
	): Observable<AlbumModelUpdate>;
	public abstract updateRelease$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate>;
}
