import {
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	SearchParams,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addAlbum = createAction(
	'[Album] Add Album',
	props<{ album: AlbumEntityAdd }>()
);

export const addAlbumFail = createAction(
	'[Album] Add Album Fail',
	props<{ error: Error }>()
);

export const addAlbumSuccess = createAction(
	'[Album] Add Album Success',
	props<{ album: AlbumEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[Album Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearAlbums = createAction('[Album] Clear Albums');

export const deleteAlbum = createAction(
	'[Album] Delete Album',
	props<{ album: AlbumEntity }>()
);

export const deleteAlbumFail = createAction(
	'[Album] Delete Album Fail',
	props<{ error: Error }>()
);

export const deleteAlbumSuccess = createAction(
	'[Album] Delete Album Success',
	props<{ albumId: string }>()
);

export const listAlbums = createAction('[Album] List Albums');

export const listAlbumsFail = createAction(
	'[Album] List Albums FAIL',
	props<{ error: Error }>()
);

export const listAlbumsSuccess = createAction(
	'[Album] List Albums Success',
	props<{ albums: AlbumEntity[] }>()
);

export const listAlbumsByCategoryId = createAction(
	'[Albums] List Albums By Category Id',
	props<{ categoryId: string }>()
);

export const listAlbumsByCategoryIdSuccess = createAction(
	'[Albums] List Albums By Category Id Success',
	props<{ albums: AlbumEntity[] }>()
);

export const loadAlbum = createAction(
	'[Album] Load Album',
	props<{ uid: string }>()
);

export const loadAlbumFail = createAction(
	'[Album] Load Album FAIL',
	props<{ error: Error }>()
);

export const loadAlbumSuccess = createAction(
	'[Album] Load Album Success',
	props<{ album: AlbumEntity | undefined }>()
);

export const search = createAction(
	'[Album] Search Albums',
	props<{ params: SearchParams }>()
);
export const searchFailed = createAction(
	'[Album] Search Albums Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[Album] Search Albums Success',
	props<{ result: AlbumEntity[] }>()
);

export const selectAlbum = createAction(
	'[Album] Select Album',
	props<{ album: AlbumEntity }>()
);

export const selectAlbumSuccess = createAction(
	'[Album] Select Album Success',
	props<{ album: AlbumEntity }>()
);

export const setSelectedAlbumId = createAction(
	'[Album Admin] Set Selected Album Id',
	props<{ albumId: string }>()
);

export const updateAlbum = createAction(
	'[Album] Update Album',
	props<{ album: AlbumEntityUpdate }>()
);

export const updateAlbumFail = createAction(
	'[Album] Update Album Fail',
	props<{ error: Error }>()
);

export const updateAlbumSuccess = createAction(
	'[Album] Update Album Success',
	props<{ album: Update<AlbumEntityUpdate> }>()
);
