import { ActionEnum } from '../../../core';
import { ReleaseResourceEnum } from './release-resource.enum';

export class ReleasePermissionsService {
	static readonly createReleaseEntity =
		ActionEnum.CREATE.toString() +
		ReleaseResourceEnum.RELEASE_ENTITY.toString();
	static readonly deleteReleaseEntity =
		ActionEnum.DELETE.toString() +
		ReleaseResourceEnum.RELEASE_ENTITY.toString();
	static readonly updateReleaseEntity =
		ActionEnum.UPDATE.toString() +
		ReleaseResourceEnum.RELEASE_ENTITY.toString();
	static readonly viewReleaseEntity =
		ActionEnum.VIEW.toString() +
		ReleaseResourceEnum.RELEASE_ENTITY.toString();
}
