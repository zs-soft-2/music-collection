import {
	AlbumEntity,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	SearchParams,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addArtist = createAction(
	'[Artist] Add Artist',
	props<{ artist: ArtistEntityAdd }>()
);

export const addArtistFail = createAction(
	'[Artist] Add Artist Fail',
	props<{ error: Error }>()
);

export const addArtistSuccess = createAction(
	'[Artist] Add Artist Success',
	props<{ artist: ArtistEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[Artist Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearArtists = createAction('[Artist] Clear Artists');

export const deleteArtist = createAction(
	'[Artist] Delete Artist',
	props<{ artist: ArtistEntity }>()
);

export const deleteArtistFail = createAction(
	'[Artist] Delete Artist Fail',
	props<{ error: Error }>()
);

export const deleteArtistSuccess = createAction(
	'[Artist] Delete Artist Success',
	props<{ artistId: string }>()
);

export const listAlbumsById = createAction(
	'[Artist] List Albums By Id',
	props<{ uid: string }>()
);

export const listAlbumsByIdFail = createAction(
	'[Artist] List Albums By Id FAIL',
	props<{ error: Error }>()
);

export const listAlbumsByIdSuccess = createAction(
	'[Artist] List Albums By Id Success',
	props<{ albums: AlbumEntity[] }>()
);

export const listArtists = createAction('[Artist] List Artists');

export const listArtistsFail = createAction(
	'[Artist] List Artists FAIL',
	props<{ error: Error }>()
);

export const listArtistsSuccess = createAction(
	'[Artist] List Artists Success',
	props<{ artists: ArtistEntity[] }>()
);

export const listArtistsByCategoryId = createAction(
	'[Artists] List Artists By Category Id',
	props<{ categoryId: string }>()
);

export const listArtistsByCategoryIdSuccess = createAction(
	'[Artists] List Artists By Category Id Success',
	props<{ artists: ArtistEntity[] }>()
);

export const loadArtist = createAction(
	'[Artist] Load Artist',
	props<{ uid: string }>()
);

export const loadArtistFail = createAction(
	'[Artist] Load Artist FAIL',
	props<{ error: Error }>()
);

export const loadArtistSuccess = createAction(
	'[Artist] Load Artist Success',
	props<{ artist: ArtistEntity | undefined }>()
);

export const search = createAction(
	'[Artist] Search Artists',
	props<{ params: SearchParams }>()
);
export const searchFailed = createAction(
	'[Artist] Search Artists Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[Artist] Search Artists Success',
	props<{ result: ArtistEntity[] }>()
);

export const selectArtist = createAction(
	'[Artist] Select Artist',
	props<{ artist: ArtistEntity }>()
);

export const selectArtistSuccess = createAction(
	'[Artist] Select Artist Success',
	props<{ artist: ArtistEntity }>()
);

export const setSelectedArtistId = createAction(
	'[Artist Admin] Set Selected Artist Id',
	props<{ artistId: string }>()
);

export const updateArtist = createAction(
	'[Artist] Update Artist',
	props<{ artist: ArtistEntityUpdate }>()
);

export const updateArtistFail = createAction(
	'[Artist] Update Artist Fail',
	props<{ error: Error }>()
);

export const updateArtistSuccess = createAction(
	'[Artist] Update Artist Success',
	props<{ artist: Update<ArtistEntityUpdate> }>()
);
