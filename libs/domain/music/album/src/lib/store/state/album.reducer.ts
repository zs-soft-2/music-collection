import { AlbumEntity, ALBUM_FEATURE_KEY } from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as albumActions from './album.actions';

export interface State extends EntityState<AlbumEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	/** Whether a name is being looked up on the server right now. */
	lookupLoading: boolean;
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
	lookupLoading: false,
	error: null,
	searchResult: [],
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
	on(albumActions.selectAlbum, (state, { album }) => ({
		...state,
		loading: false,
		error: null,
		selectedId: album.uid,
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
	/**
	 * The albums a name was looked up with on the server simply join the ones
	 * already held: no list is replaced and nothing is selected, so a lookup
	 * can run under a page that is showing something else.
	 */
	on(albumActions.lookupByName, (state) => ({
		...state,
		lookupLoading: true,
	})),
	on(albumActions.lookupByNameSuccess, (state, { result }) =>
		albumAdapter.upsertMany(result, { ...state, lookupLoading: false })
	),
	on(albumActions.lookupByNameFailed, (state, { error }) => ({
		...state,
		lookupLoading: false,
		error,
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
