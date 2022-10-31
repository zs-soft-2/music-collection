import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	AlbumStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as albumActions from './album.actions';
import * as fromAlbum from './album.reducer';
import * as albumSelectors from './album.selectors';

@Injectable()
export class AlbumStateServiceImpl extends AlbumStateService {
	public constructor(private store: Store<fromAlbum.AlbumPartialState>) {
		super();
	}

	public dispatchAddEntityAction(album: AlbumEntityAdd): void {
		this.store.dispatch(albumActions.addAlbum({ album }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			albumActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(album: AlbumEntity): void {
		this.store.dispatch(albumActions.deleteAlbum({ album }));
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(albumActions.listAlbums());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(albumActions.loadAlbum({ uid }));
	}

	public dispatchSearch(term: string): void {
		this.store.dispatch(albumActions.search({ term }));
	}

	public dispatchSelectAlbumAction(album: AlbumEntity): void {
		this.store.dispatch(albumActions.selectAlbum({ album }));
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			albumActions.setSelectedAlbumId({ albumId: entityId })
		);
	}

	public dispatchUpdateEntityAction(album: AlbumEntityUpdate): void {
		this.store.dispatch(albumActions.updateAlbum({ album }));
	}

	public isLoading$(): Observable<boolean> {
		return this.store.pipe(select(albumSelectors.isLoading));
	}

	public selectEntities$(): Observable<AlbumEntity[]> {
		return this.store.pipe(select(albumSelectors.selectAllAlbum));
	}

	public selectEntityById$(uid: string): Observable<AlbumEntity | undefined> {
		return this.store.pipe(
			select(albumSelectors.selectAlbumById(), { uid })
		);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(select(albumSelectors.isNewEntityButtonEnabled));
	}

	public selectSearchResult$(): Observable<AlbumEntity[]> {
		return this.store.pipe(select(albumSelectors.selectSearchResult));
	}

	public selectSelectedEntity$(): Observable<AlbumEntity | undefined> {
		return this.store.pipe(select(albumSelectors.selectAlbum));
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(albumSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}
}
