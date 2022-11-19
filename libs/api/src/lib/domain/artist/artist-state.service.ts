import { Observable } from 'rxjs';

import { EntityStateService } from '../../common';
import { AlbumEntity } from '../album';
import { ArtistEntity, ArtistEntityAdd, ArtistEntityUpdate } from './artist';

export abstract class ArtistStateService extends EntityStateService<
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate
> {
	public abstract dispatchListAlbumsByIdAction(uid: string): void;
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSelectArtistAction(artist: ArtistEntity): void;
	public abstract selectAlbumsById$(
		artistId: string
	): Observable<AlbumEntity[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<ArtistEntity[]>;
}
