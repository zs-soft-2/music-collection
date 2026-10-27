import { Observable } from 'rxjs';

import { EntityStateService } from '../../../common';
import { AlbumEntity, AlbumEntityAdd } from '../album';
import { ArtistEntity, ArtistEntityAdd, ArtistEntityUpdate } from './artist';
import {
	ArtistExternalAlbum,
	ArtistExternalCandidate,
	ArtistExternalProfile,
	ArtistExternalQuery,
} from './artist-external';

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
	/**
	 * Looks the name up in the catalog on the server and keeps whatever comes
	 * back, so that the rest of the client finds it from then on.
	 *
	 * For the reader whose catalog does not hold the artist at all: a scope
	 * narrowed to their genres, or a bundle built before the band was
	 * imported. Nothing is selected and no list is replaced — the artists
	 * simply join the ones already here.
	 */
	public abstract dispatchLookupByName(term: string): void;
	/** The artist's albums found online by name, country and styles. */
	public abstract fetchExternalAlbums$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalAlbum[]>;
	/** Looks the artist up online by name, country and styles; null when not found. */
	public abstract fetchExternalProfile$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalProfile | null>;
	/** The artists of the searched name found online, the best fit first. */
	public abstract searchExternalArtists$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalCandidate[]>;
	public abstract selectAlbumsById$(
		artistId: string
	): Observable<AlbumEntity[]>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	/** Whether a name is being looked up on the server right now. */
	public abstract selectLookupLoading$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<ArtistEntity[]>;
}
