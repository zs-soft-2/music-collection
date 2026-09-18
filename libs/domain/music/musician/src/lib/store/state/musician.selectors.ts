import { MUSICIAN_FEATURE_KEY, MusicianEntity } from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import {
	musicianAdapter,
	MusicianPartialState,
	State,
} from './musician.reducer';

const { selectAll, selectEntities } = musicianAdapter.getSelectors();

export const getMusicianState = createFeatureSelector<
	MusicianPartialState,
	State
>(MUSICIAN_FEATURE_KEY);

export const getMusicianError = createSelector(
	getMusicianState,
	(state: State) => state.error
);

export const getMusicianLoading = createSelector(
	getMusicianState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getMusicianState,
	(state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
	getMusicianState,
	(state: State) => state.isNewEntityButtonEnabled
);

export const selectMusicianEntities = createSelector(
	getMusicianState,
	selectEntities
);

export const selectAllMusician = createSelector(getMusicianState, selectAll);

export const selectMusician = createSelector(
	selectMusicianEntities,
	getSelectedId,
	(musicianEntities, musicianID) => musicianEntities[musicianID]
);

export const selectMusicianById = (uid: string) =>
	createSelector(
		selectMusicianEntities,
		(musicianEntities: Dictionary<MusicianEntity>) => musicianEntities[uid]
	);

export const selectSearchResult = createSelector(
	getMusicianState,
	(state: State) => state.searchResult
);
