import { ActionEnum } from '../../../core';
import { ContributionResourceEnum } from './contribution-resource.enum';

export class ContributionPermissionsService {
	static readonly createContributionEntity =
		ActionEnum.CREATE.toString() +
		ContributionResourceEnum.CONTRIBUTION_ENTITY.toString();
	static readonly deleteContributionEntity =
		ActionEnum.DELETE.toString() +
		ContributionResourceEnum.CONTRIBUTION_ENTITY.toString();
	static readonly updateContributionEntity =
		ActionEnum.UPDATE.toString() +
		ContributionResourceEnum.CONTRIBUTION_ENTITY.toString();
	static readonly viewContributionEntity =
		ActionEnum.VIEW.toString() +
		ContributionResourceEnum.CONTRIBUTION_ENTITY.toString();
}
