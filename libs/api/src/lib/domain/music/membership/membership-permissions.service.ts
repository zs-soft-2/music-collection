import { ActionEnum } from '../../../core';
import { MembershipResourceEnum } from './membership-resource.enum';

export class MembershipPermissionsService {
	static readonly createMembershipEntity =
		ActionEnum.CREATE.toString() +
		MembershipResourceEnum.MEMBERSHIP_ENTITY.toString();
	static readonly deleteMembershipEntity =
		ActionEnum.DELETE.toString() +
		MembershipResourceEnum.MEMBERSHIP_ENTITY.toString();
	static readonly updateMembershipEntity =
		ActionEnum.UPDATE.toString() +
		MembershipResourceEnum.MEMBERSHIP_ENTITY.toString();
	static readonly viewMembershipEntity =
		ActionEnum.VIEW.toString() +
		MembershipResourceEnum.MEMBERSHIP_ENTITY.toString();
}
