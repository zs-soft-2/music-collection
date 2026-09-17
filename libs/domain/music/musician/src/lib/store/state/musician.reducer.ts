import { MusicianEntity, MUSICIAN_FEATURE_KEY } from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as musicianActions from './musician.actions';

export interface State extends EntityState<MusicianEntity> {
	isNewEntityButtonEnabled: boolean;
	selectedId?: string;
	loading: boolean;
	searchResult: MusicianEntity[];
	error?: string | null;
}

export interface MusicianPartialState {
	readonly [MUSICIAN_FEATURE_KEY]: State;
}

export function sort(a: MusicianEntity, b: MusicianEntity): number {
	return a.name.localeCompare(b.name);
}

export const musicianAdapter: EntityAdapter<MusicianEntity> =
	createEntityAdapter<MusicianEntity>({
		selectId: (model: MusicianEntity) => model.uid || '',
		sortComparer: sort,
	});

export const initialState: State = musicianAdapter.getInitialState({
	isNewEntityButtonEnabled: true,
	loading: false,
	error: null,
	searchResult: [],
});

export const musicianReducer = createReducer(
	initialState,
	on(musicianActions.addMusicianSuccess, (state, { musician }) =>
		musicianAdapter.addOne(musician as MusicianEntity, state)
	),
	on(musicianActions.changeNewEntityButtonEnabled, (state, { enabled }) => ({
		...state,
		isNewEntityButtonEnabled: enabled,
	})),
	on(musicianActions.selectMusician, (state, { musician }) => ({
		...state,
		loading: false,
		error: null,
		selectedId: musician.uid,
	})),
	on(musicianActions.updateMusicianSuccess, (state, { musician }) =>
		musicianAdapter.updateOne(musician, state)
	),
	on(musicianActions.deleteMusicianSuccess, (state, { musicianId }) =>
		musicianAdapter.removeOne(musicianId, state)
	),
	on(musicianActions.listMusicians, (state) => ({ ...state, loading: true })),
	on(musicianActions.listMusiciansSuccess, (state, { musicians }) =>
		musicianAdapter.upsertMany(musicians as MusicianEntity[], {
			...state,
			loading: false,
		})
	),
	on(musicianActions.loadMusicianSuccess, (state, { musician }) =>
		musician ? musicianAdapter.upsertOne(musician, state) : state
	),
	on(musicianActions.clearMusicians, (state) =>
		musicianAdapter.removeAll(state)
	),
	on(musicianActions.setSelectedMusicianId, (state, { musicianId }) => ({
		...state,
		selectedId: musicianId,
	})),
	on(musicianActions.searchSuccess, (state, { result }) => {
		return musicianAdapter.upsertMany(result, {
			...state,
			searchResult: result,
		});
	}),
	on(musicianActions.searchFailed, (state, { error }) => ({
		...state,
		searchResult: [],
		error,
	}))
);

export function reducer(state: State | undefined, action: Action) {
	return musicianReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
	musicianAdapter.getSelectors();
