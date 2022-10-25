import { AlbumEntity, ALBUM_FEATURE_KEY } from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as albumActions from './album.actions';

export interface State extends EntityState<AlbumEntity> {
  isNewEntityButtonEnabled: boolean;
  selectedId?: string;
  loading: boolean;
  searchResult: AlbumEntity[];
  error?: string | null;
}

export interface AlbumPartialState {
  readonly [ALBUM_FEATURE_KEY]: State;
}

export function sort(a: AlbumEntity, b: AlbumEntity): number {
  return a.name < b.name ? 1 : -1;
}

export const albumAdapter: EntityAdapter<AlbumEntity> =
  createEntityAdapter<AlbumEntity>({
    selectId: (model: AlbumEntity) => model.uid || '',
    sortComparer: sort,
  });

export const initialState: State = albumAdapter.getInitialState({
  isNewEntityButtonEnabled: true,
  loading: false,
  error: null,
  searchResult: [],
  selectedAlbumId: null,
});

export const albumReducer = createReducer(
  initialState,
  on(albumActions.addAlbumSuccess, (state, { album }) =>
    albumAdapter.addOne(album as AlbumEntity, state)
  ),
  on(albumActions.changeNewEntityButtonEnabled, (state, { enabled }) => ({
    ...state,
    isNewEntityButtonEnabled: enabled,
  })),
  on(albumActions.selectAlbum, (state, { albumId }) => ({
    ...state,
    loading: false,
    error: null,
    selectedAlbumId: albumId,
  })),
  on(albumActions.updateAlbumSuccess, (state, { album }) =>
    albumAdapter.updateOne(album, state)
  ),
  on(albumActions.deleteAlbumSuccess, (state, { albumId }) =>
    albumAdapter.removeOne(albumId, state)
  ),
  on(albumActions.listAlbumsSuccess, (state, { albums }) =>
    albumAdapter.upsertMany(albums as AlbumEntity[], state)
  ),
  on(albumActions.loadAlbumSuccess, (state, { album }) =>
    albumAdapter.upsertOne(album as AlbumEntity, state)
  ),
  on(albumActions.clearAlbums, (state) => albumAdapter.removeAll(state)),
  on(albumActions.setSelectedAlbumId, (state, { albumId }) => ({
    ...state,
    selectedId: albumId,
  })),
  on(albumActions.searchSuccess, (state, { result }) => ({
    ...state,
    searchResult: result,
  })),
  on(albumActions.searchFailed, (state, { error }) => ({
    ...state,
    searchResult: [],
    error,
  }))
);

export function reducer(state: State | undefined, action: Action) {
  return albumReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
  albumAdapter.getSelectors();
