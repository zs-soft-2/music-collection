import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AlbumEntity,
	AlbumEntityAdd,
	AlbumDataService,
	AlbumEntityUpdate,
	AlbumExternalProfile,
	AlbumExternalTrack,
	AlbumExternalTracks,
	AlbumStateService,
	TrackEntity,
	SearchParams,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as albumActions from './album.actions';
import * as fromAlbum from './album.reducer';
import * as albumSelectors from './album.selectors';

@Injectable()
export class AlbumStateServiceImpl extends AlbumStateService {
	private albumDataService = inject(AlbumDataService);
	private store = inject<Store<fromAlbum.AlbumPartialState>>(Store);

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

	public dispatchSearch(params: SearchParams): void {
		this.store.dispatch(albumActions.search({ params }));
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

	public fetchExternalProfile$(
		artistName: string,
		name: string
	): Observable<AlbumExternalProfile | null> {
		return this.albumDataService.fetchExternalProfile$(artistName, name);
	}

	public fetchExternalTracks$(
		artistName: string,
		name: string
	): Observable<AlbumExternalTracks | null> {
		return this.albumDataService.fetchExternalTracks$(artistName, name);
	}

	public listTracks$(albumUid: string): Observable<TrackEntity[]> {
		return this.albumDataService.listTracks$(albumUid);
	}

	public saveTracks(
		albumUid: string,
		tracks: AlbumExternalTrack[],
		existing: TrackEntity[]
	): Promise<void> {
		return this.albumDataService.saveTracks(albumUid, tracks, existing);
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
