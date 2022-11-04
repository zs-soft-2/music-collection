import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
} from '@music-collection/api';
import { Update } from '@ngrx/entity';
import { createAction, props } from '@ngrx/store';

export const addRelease = createAction(
	'[Release] Add Release',
	props<{ release: ReleaseEntityAdd }>()
);

export const addReleaseFail = createAction(
	'[Release] Add Release Fail',
	props<{ error: Error }>()
);

export const addReleaseSuccess = createAction(
	'[Release] Add Release Success',
	props<{ release: ReleaseEntity }>()
);

export const changeNewEntityButtonEnabled = createAction(
	'[Release Admin] Change new Entity Button Enabled',
	props<{ enabled: boolean }>()
);

export const clearReleases = createAction('[Release] Clear Releases');

export const deleteRelease = createAction(
	'[Release] Delete Release',
	props<{ release: ReleaseEntity }>()
);

export const deleteReleaseFail = createAction(
	'[Release] Delete Release Fail',
	props<{ error: Error }>()
);

export const deleteReleaseSuccess = createAction(
	'[Release] Delete Release Success',
	props<{ releaseId: string }>()
);

export const listReleases = createAction('[Release] List Releases');

export const listReleasesFail = createAction(
	'[Release] List Releases FAIL',
	props<{ error: Error }>()
);

export const listReleasesSuccess = createAction(
	'[Release] List Releases Success',
	props<{ releases: ReleaseEntity[] }>()
);

export const listReleasesByCategoryId = createAction(
	'[Releases] List Releases By Category Id',
	props<{ categoryId: string }>()
);

export const listReleasesByCategoryIdSuccess = createAction(
	'[Releases] List Releases By Category Id Success',
	props<{ releases: ReleaseEntity[] }>()
);

export const loadRelease = createAction(
	'[Release] Load Release',
	props<{ uid: string }>()
);

export const loadReleaseFail = createAction(
	'[Release] Load Release FAIL',
	props<{ error: Error }>()
);

export const loadReleaseSuccess = createAction(
	'[Release] Load Release Success',
	props<{ release: ReleaseEntity | undefined }>()
);

export const search = createAction(
	'[Release] Search Releases',
	props<{ term: string }>()
);
export const searchFailed = createAction(
	'[Release] Search Releases Failed',
	props<{ error: string }>()
);
export const searchSuccess = createAction(
	'[Release] Search Releases Success',
	props<{ result: ReleaseEntity[] }>()
);

export const selectRelease = createAction(
	'[Release] Select Release',
	props<{ release: ReleaseEntity }>()
);

export const selectReleaseSuccess = createAction(
	'[Release] Select Release Success',
	props<{ release: ReleaseEntity }>()
);

export const setSelectedReleaseId = createAction(
	'[Release Admin] Set Selected Release Id',
	props<{ releaseId: string }>()
);

export const updateRelease = createAction(
	'[Release] Update Release',
	props<{ release: ReleaseEntityUpdate }>()
);

export const updateReleaseFail = createAction(
	'[Release] Update Release Fail',
	props<{ error: Error }>()
);

export const updateReleaseSuccess = createAction(
	'[Release] Update Release Success',
	props<{ release: Update<ReleaseEntityUpdate> }>()
);
