import { RELEASE_FEATURE_KEY, ReleaseEntity } from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { releaseAdapter, ReleasePartialState, State } from './release.reducer';

const { selectAll, selectEntities } = releaseAdapter.getSelectors();

export const getReleaseState = createFeatureSelector<
	ReleasePartialState,
	State
>(RELEASE_FEATURE_KEY);

export const getReleaseError = createSelector(
	getReleaseState,
	(state: State) => state.error
);

export const getReleaseLoading = createSelector(
	getReleaseState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getReleaseState,
	(state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
	getReleaseState,
	(state: State) => state.isNewEntityButtonEnabled
);

export const selectReleaseEntities = createSelector(
	getReleaseState,
	selectEntities
);

export const selectAllRelease = createSelector(getReleaseState, selectAll);

export const selectRelease = createSelector(
	selectReleaseEntities,
	getSelectedId,
	(releaseEntities, releaseID) => releaseEntities[releaseID]
);

export const selectReleaseById = () =>
	createSelector(
		selectReleaseEntities,
		(releaseEntities: Dictionary<ReleaseEntity>, props: any) => {
			const releaseEntity = releaseEntities[props.uid];

			return releaseEntity;
		}
	);

export const selectSearchResult = createSelector(
	getReleaseState,
	(state: State) => state.searchResult
);
