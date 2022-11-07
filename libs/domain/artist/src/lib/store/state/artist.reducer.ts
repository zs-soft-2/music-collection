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
	error: null,
	searchResult: [],
	selectedArtistId: null,
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
		selectedArtistId: artist.uid,
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
