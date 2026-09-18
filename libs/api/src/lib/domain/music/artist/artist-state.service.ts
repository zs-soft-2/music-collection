import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity } from '../album';
import { ArtistEntity, ArtistEntityAdd, ArtistEntityUpdate } from './artist';
import { ArtistExternalProfile } from './artist-external';

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
	/** Looks the artist up online by name; null when not found. */
	public abstract fetchExternalProfile$(
		name: string
	): Observable<ArtistExternalProfile | null>;
	public abstract selectAlbumsById$(
		artistId: string
	): Observable<AlbumEntity[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<ArtistEntity[]>;
}
