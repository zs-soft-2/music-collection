import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as artistActions from './artist.actions';
import * as fromArtist from './artist.reducer';
import * as artistSelectors from './artist.selectors';

@Injectable()
export class ArtistStateServiceImpl extends ArtistStateService {
	public constructor(private store: Store<fromArtist.ArtistPartialState>) {
		super();
	}

	public dispatchAddEntityAction(artist: ArtistEntityAdd): void {
		this.store.dispatch(artistActions.addArtist({ artist }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			artistActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(artist: ArtistEntity): void {
		this.store.dispatch(artistActions.deleteArtist({ artist }));
	}

	public dispatchListAlbumsByIdAction(uid: string): void {
		this.store.dispatch(artistActions.listAlbumsById({ uid }));
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(artistActions.listArtists());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(artistActions.loadArtist({ uid }));
	}

	public dispatchSearch(term: string): void {
		this.store.dispatch(artistActions.search({ term }));
	}

	public dispatchSelectArtistAction(artist: ArtistEntity): void {
		this.store.dispatch(artistActions.selectArtist({ artist }));
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			artistActions.setSelectedArtistId({ artistId: entityId })
		);
	}

	public dispatchUpdateEntityAction(artist: ArtistEntityUpdate): void {
		this.store.dispatch(artistActions.updateArtist({ artist }));
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public selectAlbumsById$(): Observable<AlbumEntity[] | undefined> {
		return this.store.pipe(select(artistSelectors.selectAlbumsById()));
	}

	public selectEntities$(): Observable<ArtistEntity[]> {
		return this.store.pipe(select(artistSelectors.selectAllArtist));
	}

	public selectEntityById$(
		uid: string
	): Observable<ArtistEntity | undefined> {
		return this.store.pipe(select(artistSelectors.selectArtistById(uid)));
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(
			select(artistSelectors.isNewEntityButtonEnabled)
		);
	}

	public selectSearchResult$(): Observable<ArtistEntity[]> {
		return this.store.pipe(select(artistSelectors.selectSearchResult));
	}

	public selectSelectedEntity$(): Observable<ArtistEntity | undefined> {
		return this.store.pipe(select(artistSelectors.selectArtist));
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(artistSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}
}
