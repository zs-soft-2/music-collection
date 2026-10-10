import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	DiscogsVersion,
	ReleaseDataService,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseStateService,
	SearchParams,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as releaseActions from './release.actions';
import * as fromRelease from './release.reducer';
import * as releaseSelectors from './release.selectors';

@Injectable()
export class ReleaseStateServiceImpl extends ReleaseStateService {
	private releaseDataService = inject(ReleaseDataService);
	private store = inject<Store<fromRelease.ReleasePartialState>>(Store);

	public dispatchAddEntityAction(release: ReleaseEntityAdd): void {
		this.store.dispatch(releaseActions.addRelease({ release }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			releaseActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	/**
	 * Not this way. Deleting a pressing has to ask first whether a collector
	 * owns a copy of it, and then delete on the server inside a transaction;
	 * `ReleaseDeletionEffect` is where that lives. This store held a delete
	 * that did neither, so it is gone rather than left as a second door.
	 */
	public dispatchDeleteEntityAction(release: ReleaseEntity): void {
		throw new Error('Use ReleaseDeletionEffect to delete a release.');
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

	public dispatchSearch(params: SearchParams): void {
		this.store.dispatch(releaseActions.search({ params }));
	}

	public dispatchSelectReleaseAction(release: ReleaseEntity): void {
		this.store.dispatch(releaseActions.selectRelease({ release }));
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			releaseActions.setSelectedReleaseId({ releaseId: entityId })
		);
	}

	public dispatchUpdateEntityAction(release: ReleaseEntityUpdate): void {
		this.store.dispatch(releaseActions.updateRelease({ release }));
	}

	public findExternalMaster$(
		artistName: string,
		albumName: string
	): Observable<number | null> {
		return this.releaseDataService.findExternalMaster$(
			artistName,
			albumName
		);
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public listExternalVersions$(
		masterId: number
	): Observable<DiscogsVersion[]> {
		return this.releaseDataService.listExternalVersions$(masterId);
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
