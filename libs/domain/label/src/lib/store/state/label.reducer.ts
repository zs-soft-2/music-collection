import { LabelEntity, LABEL_FEATURE_KEY } from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as labelActions from './label.actions';

export interface State extends EntityState<LabelEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	searchResult: LabelEntity[];
	error?: string | null;
}

export interface LabelPartialState {
	readonly [LABEL_FEATURE_KEY]: State;
}

export function sort(a: LabelEntity, b: LabelEntity): number {
	return a.name < b.name ? 1 : -1;
}

export const labelAdapter: EntityAdapter<LabelEntity> =
	createEntityAdapter<LabelEntity>({
		selectId: (model: LabelEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = labelAdapter.getInitialState({
	isNewEntityButtonEnabled: true,
	loading: false,
	error: null,
	searchResult: [],
	selectedLabelId: null,
});

export const labelReducer = createReducer(
	initialState,
	on(labelActions.addLabelSuccess, (state, { label }) =>
		labelAdapter.addOne(label as LabelEntity, state)
	),
	on(labelActions.changeNewEntityButtonEnabled, (state, { enabled }) => ({
		...state,
		isNewEntityButtonEnabled: enabled,
	})),
	on(labelActions.selectLabel, (state, { label }) => ({
		...state,
		loading: false,
		error: null,
		selectedLabelId: label.uid,
	})),
	on(labelActions.updateLabelSuccess, (state, { label }) =>
		labelAdapter.updateOne(label, state)
	),
	on(labelActions.deleteLabelSuccess, (state, { labelId }) =>
		labelAdapter.removeOne(labelId, state)
	),
	on(labelActions.listLabelsSuccess, (state, { labels }) =>
		labelAdapter.upsertMany(labels as LabelEntity[], state)
	),
	on(labelActions.loadLabelSuccess, (state, { label }) =>
		labelAdapter.upsertOne(label as LabelEntity, state)
	),
	on(labelActions.clearLabels, (state) => labelAdapter.removeAll(state)),
	on(labelActions.setSelectedLabelId, (state, { labelId }) => ({
		...state,
		selectedId: labelId,
	})),
	on(labelActions.searchSuccess, (state, { result }) => {
		return labelAdapter.upsertMany(result, {
			...state,
			searchResult: result,
		});
	}),
	on(labelActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return labelReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	labelAdapter.getSelectors();
