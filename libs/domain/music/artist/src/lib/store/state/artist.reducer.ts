import {
	AlbumEntity,
	ArtistEntity,
	ARTIST_FEATURE_KEY,
} from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as artistActions from './artist.actions';

export interface State extends EntityState<ArtistEntity> {
	albumsById: AlbumEntity[] | undefined;
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	/** Whether a name is being looked up on the server right now. */
	lookupLoading: boolean;
	searchResult: ArtistEntity[];
	error?: string | null;
}

export interface ArtistPartialState {
	readonly [ARTIST_FEATURE_KEY]: State;
}

export function sort(a: ArtistEntity, b: ArtistEntity): number {
	return a.name < b.name ? 1 : -1;
}

export const artistAdapter: EntityAdapter<ArtistEntity> =
	createEntityAdapter<ArtistEntity>({
		selectId: (model: ArtistEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = artistAdapter.getInitialState({
	albumsById: undefined,
	isNewEntityButtonEnabled: true,
	loading: false,
	lookupLoading: false,
	error: null,
	searchResult: [],
});

export const artistReducer = createReducer(
	initialState,
	on(artistActions.addArtistSuccess, (state, { artist }) =>
		artistAdapter.addOne(artist as ArtistEntity, state)
	),
	on(artistActions.changeNewEntityButtonEnabled, (state, { enabled }) => ({
		...state,
		isNewEntityButtonEnabled: enabled,
	})),
	on(artistActions.selectArtistSuccess, (state, { artist }) => ({
		...state,
		loading: false,
		error: null,
		selectedId: artist.uid,
	})),
	on(artistActions.updateArtistSuccess, (state, { artist }) =>
		artistAdapter.updateOne(artist, state)
	),
	on(artistActions.deleteArtistSuccess, (state, { artistId }) =>
		artistAdapter.removeOne(artistId, state)
	),
	on(artistActions.listAlbumsByIdSuccess, (state, { albums }) => ({
		...state,
		loading: false,
		error: null,
		albumsById: albums,
	})),
	on(artistActions.listArtistsSuccess, (state, { artists }) =>
		artistAdapter.upsertMany(artists as ArtistEntity[], state)
	),
	on(artistActions.loadArtistSuccess, (state, { artist }) => {
		if (artist) {
			return artistAdapter.upsertOne(artist as ArtistEntity, {
				...state,
				albumsById: undefined,
			});
		} else {
			return {
				...state,
				albumsById: undefined,
			};
		}
	}),
	on(artistActions.clearArtists, (state) => artistAdapter.removeAll(state)),
	on(artistActions.setSelectedArtistId, (state, { artistId }) => ({
		...state,
		selectedId: artistId,
	})),
	/**
	 * The artists a name was looked up with on the server simply join the
	 * ones already held: no list is replaced and nothing is selected, so a
	 * lookup can run under a page that is showing something else.
	 */
	on(artistActions.lookupByName, (state) => ({
		...state,
		lookupLoading: true,
	})),
	on(artistActions.lookupByNameSuccess, (state, { result }) =>
		artistAdapter.upsertMany(result, { ...state, lookupLoading: false })
	),
	on(artistActions.lookupByNameFailed, (state, { error }) => ({
		...state,
		lookupLoading: false,
		error,
	})),
	on(artistActions.searchSuccess, (state, { result }) => {
		return artistAdapter.upsertMany(result, {
			...state,
			searchResult: result,
		});
	}),
	on(artistActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return artistReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	artistAdapter.getSelectors();
