import { ARTIST_FEATURE_KEY, ArtistEntity } from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { artistAdapter, ArtistPartialState, State } from './artist.reducer';

const { selectAll, selectEntities } = artistAdapter.getSelectors();

export const getArtistState = createFeatureSelector<ArtistPartialState, State>(
  ARTIST_FEATURE_KEY
);

export const getArtistError = createSelector(
  getArtistState,
  (state: State) => state.error
);

export const getArtistLoading = createSelector(
  getArtistState,
  (state: State) => state.loading
);

export const getSelectedId = createSelector(
  getArtistState,
  (state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
  getArtistState,
  (state: State) => state.isNewEntityButtonEnabled
);

export const selectArtistEntities = createSelector(
  getArtistState,
  selectEntities
);

export const selectAllArtist = createSelector(getArtistState, selectAll);

export const selectArtist = createSelector(
  selectArtistEntities,
  getSelectedId,
  (artistEntities, artistID) => artistEntities[artistID]
);

export const selectArtistById = () =>
  createSelector(
    selectArtistEntities,
    (artistEntities: Dictionary<ArtistEntity>, props: any) => {
      const artistEntity = artistEntities[props.uid];

      return artistEntity;
    }
  );

export const selectSearchResult = createSelector(
  getArtistState,
  (state: State) => state.searchResult
);
