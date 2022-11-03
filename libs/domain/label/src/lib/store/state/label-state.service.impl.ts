import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as labelActions from './label.actions';
import * as fromLabel from './label.reducer';
import * as labelSelectors from './label.selectors';

@Injectable()
export class LabelStateServiceImpl extends LabelStateService {
	public constructor(private store: Store<fromLabel.LabelPartialState>) {
		super();
	}

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

	public dispatchSearch(term: string): void {
		this.store.dispatch(labelActions.search({ term }));
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
