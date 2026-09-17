import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate,
	MusicianStateService,
	SearchParams,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as musicianActions from './musician.actions';
import * as fromMusician from './musician.reducer';
import * as musicianSelectors from './musician.selectors';

@Injectable()
export class MusicianStateServiceImpl extends MusicianStateService {
	private store = inject<Store<fromMusician.MusicianPartialState>>(Store);

	public dispatchAddEntityAction(musician: MusicianEntityAdd): void {
		this.store.dispatch(musicianActions.addMusician({ musician }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			musicianActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(musician: MusicianEntity): void {
		this.store.dispatch(musicianActions.deleteMusician({ musician }));
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(musicianActions.listMusicians());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(musicianActions.loadMusician({ uid }));
	}

	public dispatchSearch(params: SearchParams): void {
		this.store.dispatch(musicianActions.search({ params }));
	}

	public dispatchSelectMusicianAction(musician: MusicianEntity): void {
		this.store.dispatch(musicianActions.selectMusician({ musician }));
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			musicianActions.setSelectedMusicianId({ musicianId: entityId })
		);
	}

	public dispatchUpdateEntityAction(musician: MusicianEntityUpdate): void {
		this.store.dispatch(musicianActions.updateMusician({ musician }));
	}

	public isLoading$(): Observable<boolean> {
		return this.store.pipe(select(musicianSelectors.getMusicianLoading));
	}

	public selectEntities$(): Observable<MusicianEntity[]> {
		return this.store.pipe(select(musicianSelectors.selectAllMusician));
	}

	public selectEntityById$(
		uid: string
	): Observable<MusicianEntity | undefined> {
		return this.store.pipe(
			select(musicianSelectors.selectMusicianById(uid))
		);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(
			select(musicianSelectors.isNewEntityButtonEnabled)
		);
	}

	public selectSearchResult$(): Observable<MusicianEntity[]> {
		return this.store.pipe(select(musicianSelectors.selectSearchResult));
	}

	public selectSelectedEntity$(): Observable<MusicianEntity | undefined> {
		return this.store.pipe(select(musicianSelectors.selectMusician));
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(musicianSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}
}
