import { ALBUM_FEATURE_KEY, AlbumEntity } from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { albumAdapter, AlbumPartialState, State } from './album.reducer';

const { selectAll, selectEntities } = albumAdapter.getSelectors();

export const getAlbumState = createFeatureSelector<AlbumPartialState, State>(
	ALBUM_FEATURE_KEY
);

export const getAlbumError = createSelector(
	getAlbumState,
	(state: State) => state.error
);

export const getAlbumLoading = createSelector(
	getAlbumState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getAlbumState,
	(state: State) => state.selectedId || ''
);

export const isNewEntityButtonEnabled = createSelector(
	getAlbumState,
	(state: State) => state.isNewEntityButtonEnabled
);

export const selectAlbumEntities = createSelector(
	getAlbumState,
	selectEntities
);

export const selectAllAlbum = createSelector(getAlbumState, selectAll);

export const selectAlbum = createSelector(
	selectAlbumEntities,
	getSelectedId,
	(albumEntities, albumID) => albumEntities[albumID]
);

export const selectAlbumById = () =>
	createSelector(
		selectAlbumEntities,
		(albumEntities: Dictionary<AlbumEntity>, props: any) => {
			const albumEntity = albumEntities[props.uid];

			return albumEntity;
		}
	);

export const selectSearchResult = createSelector(
	getAlbumState,
	(state: State) => state.searchResult
);
