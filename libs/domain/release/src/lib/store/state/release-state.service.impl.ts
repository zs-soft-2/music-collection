import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as releaseActions from './release.actions';
import * as fromRelease from './release.reducer';
import * as releaseSelectors from './release.selectors';

@Injectable()
export class ReleaseStateServiceImpl extends ReleaseStateService {
	public constructor(private store: Store<fromRelease.ReleasePartialState>) {
		super();
	}

	public dispatchAddEntityAction(release: ReleaseEntityAdd): void {
		this.store.dispatch(releaseActions.addRelease({ release }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			releaseActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(release: ReleaseEntity): void {
		this.store.dispatch(releaseActions.deleteRelease({ release }));
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(releaseActions.listReleases());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(releaseActions.loadRelease({ uid }));
	}

	public dispatchSearch(term: string): void {
		this.store.dispatch(releaseActions.search({ term }));
	}

	public dispatchSelectReleaseAction(uid: string): void {
		this.store.dispatch(releaseActions.selectRelease({ releaseId: uid }));
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			releaseActions.setSelectedReleaseId({ releaseId: entityId })
		);
	}

	public dispatchUpdateEntityAction(release: ReleaseEntityUpdate): void {
		this.store.dispatch(releaseActions.updateRelease({ release }));
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public selectEntities$(): Observable<ReleaseEntity[]> {
		return this.store.pipe(select(releaseSelectors.selectAllRelease));
	}

	public selectEntityById$(
		uid: string
	): Observable<ReleaseEntity | undefined> {
		return this.store.pipe(
			select(releaseSelectors.selectReleaseById(), { uid })
		);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(
			select(releaseSelectors.isNewEntityButtonEnabled)
		);
	}

	public selectSearchResult$(): Observable<ReleaseEntity[]> {
		return this.store.pipe(select(releaseSelectors.selectSearchResult));
	}

	public selectSelectedEntity$(): Observable<ReleaseEntity | undefined> {
		return this.store.pipe(select(releaseSelectors.selectRelease));
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(releaseSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}
}
