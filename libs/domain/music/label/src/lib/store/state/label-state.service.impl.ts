import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	LabelDataService,
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelExternalCandidate,
	LabelExternalProfile,
	LabelStateService,
	SearchParams,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as labelActions from './label.actions';
import * as fromLabel from './label.reducer';
import * as labelSelectors from './label.selectors';

@Injectable()
export class LabelStateServiceImpl extends LabelStateService {
	private labelDataService = inject(LabelDataService);
	private store = inject<Store<fromLabel.LabelPartialState>>(Store);

	public dispatchAddEntityAction(label: LabelEntityAdd): void {
		this.store.dispatch(labelActions.addLabel({ label }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			labelActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchDeleteEntityAction(label: LabelEntity): void {
		this.store.dispatch(labelActions.deleteLabel({ label }));
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(labelActions.listLabels());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(labelActions.loadLabel({ uid }));
	}

	public dispatchSearch(params: SearchParams): void {
		this.store.dispatch(labelActions.search({ params }));
	}

	public dispatchSelectLabelAction(label: LabelEntity): void {
		this.store.dispatch(labelActions.selectLabel({ label }));
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			labelActions.setSelectedLabelId({ labelId: entityId })
		);
	}

	public dispatchUpdateEntityAction(label: LabelEntityUpdate): void {
		this.store.dispatch(labelActions.updateLabel({ label }));
	}

	public fetchExternalProfile$(
		discogsId: number
	): Observable<LabelExternalProfile> {
		return this.labelDataService.fetchExternalProfile$(discogsId);
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public selectEntities$(): Observable<LabelEntity[]> {
		return this.store.pipe(select(labelSelectors.selectAllLabel));
	}

	public selectEntityById$(uid: string): Observable<LabelEntity | undefined> {
		return this.store.pipe(
			select(labelSelectors.selectLabelById(), { uid })
		);
	}

	public searchExternalLabels$(
		name: string
	): Observable<LabelExternalCandidate[]> {
		return this.labelDataService.searchExternalLabels$(name);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(select(labelSelectors.isNewEntityButtonEnabled));
	}

	public selectSearchResult$(): Observable<LabelEntity[]> {
		return this.store.pipe(select(labelSelectors.selectSearchResult));
	}

	public selectSelectedEntity$(): Observable<LabelEntity | undefined> {
		return this.store.pipe(select(labelSelectors.selectLabel));
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(labelSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}
}
