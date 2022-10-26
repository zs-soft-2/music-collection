import { ReleaseEntity, RELEASE_FEATURE_KEY } from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as releaseActions from './release.actions';

export interface State extends EntityState<ReleaseEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	searchResult: ReleaseEntity[];
	error?: string | null;
}

export interface ReleasePartialState {
	readonly [RELEASE_FEATURE_KEY]: State;
}

export function sort(a: ReleaseEntity, b: ReleaseEntity): number {
	return a.name < b.name ? 1 : -1;
}

export const releaseAdapter: EntityAdapter<ReleaseEntity> =
	createEntityAdapter<ReleaseEntity>({
		selectId: (model: ReleaseEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = releaseAdapter.getInitialState({
	isNewEntityButtonEnabled: true,
	loading: false,
	error: null,
	searchResult: [],
	selectedReleaseId: null,
});

export const releaseReducer = createReducer(
	initialState,
	on(releaseActions.addReleaseSuccess, (state, { release }) =>
		releaseAdapter.addOne(release as ReleaseEntity, state)
	),
	on(releaseActions.changeNewEntityButtonEnabled, (state, { enabled }) => ({
		...state,
		isNewEntityButtonEnabled: enabled,
	})),
	on(releaseActions.selectRelease, (state, { releaseId }) => ({
		...state,
		loading: false,
		error: null,
		selectedReleaseId: releaseId,
	})),
	on(releaseActions.updateReleaseSuccess, (state, { release }) =>
		releaseAdapter.updateOne(release, state)
	),
	on(releaseActions.deleteReleaseSuccess, (state, { releaseId }) =>
		releaseAdapter.removeOne(releaseId, state)
	),
	on(releaseActions.listReleasesSuccess, (state, { releases }) =>
		releaseAdapter.upsertMany(releases as ReleaseEntity[], state)
	),
	on(releaseActions.loadReleaseSuccess, (state, { release }) =>
		releaseAdapter.upsertOne(release as ReleaseEntity, state)
	),
	on(releaseActions.clearReleases, (state) =>
		releaseAdapter.removeAll(state)
	),
	on(releaseActions.setSelectedReleaseId, (state, { releaseId }) => ({
		...state,
		selectedId: releaseId,
	})),
	on(releaseActions.searchSuccess, (state, { result }) => ({
		...state,
		searchResult: result,
	})),
	on(releaseActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return releaseReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	releaseAdapter.getSelectors();
