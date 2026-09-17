import {
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate,
	SearchParams,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addMusician = createAction(
	'[Musician] Add Musician',
	props<{ musician: MusicianEntityAdd }>()
);

export const addMusicianFail = createAction(
	'[Musician] Add Musician Fail',
	props<{ error: Error }>()
);

export const addMusicianSuccess = createAction(
	'[Musician] Add Musician Success',
	props<{ musician: MusicianEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[Musician Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearMusicians = createAction('[Musician] Clear Musicians');

export const deleteMusician = createAction(
	'[Musician] Delete Musician',
	props<{ musician: MusicianEntity }>()
);

export const deleteMusicianFail = createAction(
	'[Musician] Delete Musician Fail',
	props<{ error: Error }>()
);

export const deleteMusicianSuccess = createAction(
	'[Musician] Delete Musician Success',
	props<{ musicianId: string }>()
);

export const listMusicians = createAction('[Musician] List Musicians');

export const listMusiciansFail = createAction(
	'[Musician] List Musicians FAIL',
	props<{ error: Error }>()
);

export const listMusiciansSuccess = createAction(
	'[Musician] List Musicians Success',
	props<{ musicians: MusicianEntity[] }>()
);

export const listMusiciansByCategoryId = createAction(
	'[Musicians] List Musicians By Category Id',
	props<{ categoryId: string }>()
);

export const listMusiciansByCategoryIdSuccess = createAction(
	'[Musicians] List Musicians By Category Id Success',
	props<{ musicians: MusicianEntity[] }>()
);

export const loadMusician = createAction(
	'[Musician] Load Musician',
	props<{ uid: string }>()
);

export const loadMusicianFail = createAction(
	'[Musician] Load Musician FAIL',
	props<{ error: Error }>()
);

export const loadMusicianSuccess = createAction(
	'[Musician] Load Musician Success',
	props<{ musician: MusicianEntity | undefined }>()
);

export const search = createAction(
	'[Musician] Search Musicians',
	props<{ params: SearchParams }>()
);
export const searchFailed = createAction(
	'[Musician] Search Musicians Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[Musician] Search Musicians Success',
	props<{ result: MusicianEntity[] }>()
);

export const selectMusician = createAction(
	'[Musician] Select Musician',
	props<{ musician: MusicianEntity }>()
);

export const selectMusicianSuccess = createAction(
	'[Musician] Select Musician Success',
	props<{ musician: MusicianEntity }>()
);

export const setSelectedMusicianId = createAction(
	'[Musician Admin] Set Selected Musician Id',
	props<{ musicianId: string }>()
);

export const updateMusician = createAction(
	'[Musician] Update Musician',
	props<{ musician: MusicianEntityUpdate }>()
);

export const updateMusicianFail = createAction(
	'[Musician] Update Musician Fail',
	props<{ error: Error }>()
);

export const updateMusicianSuccess = createAction(
	'[Musician] Update Musician Success',
	props<{ musician: Update<MusicianEntityUpdate> }>()
);
