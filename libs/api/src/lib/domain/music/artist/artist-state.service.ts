import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity, AlbumEntityAdd } from '../album';
import { ArtistEntity, ArtistEntityAdd, ArtistEntityUpdate } from './artist';
import { ArtistExternalAlbum, ArtistExternalProfile } from './artist-external';

export abstract class ArtistStateService extends EntityStateService<
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate
> {
	/** Creates the albums one after the other. */
	public abstract dispatchAddAlbumsAction(albums: AlbumEntityAdd[]): void;
	public abstract dispatchListAlbumsByIdAction(uid: string): void;
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchSelectArtistAction(artist: ArtistEntity): void;
	/** The artist's albums found online by the artist's name. */
	public abstract fetchExternalAlbums$(
		name: string
	): Observable<ArtistExternalAlbum[]>;
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
