import { ActionEnum } from '../action';
import { RoleResourceEnum } from './role-resource.enum';

export class RolePermissionsService {
	static readonly createRoleEntity =
		ActionEnum.CREATE.toString() + RoleResourceEnum.ROLE_ENTITY.toString();
	static readonly deleteRoleEntity =
		ActionEnum.DELETE.toString() + RoleResourceEnum.ROLE_ENTITY.toString();
	static readonly updateRoleEntity =
		ActionEnum.UPDATE.toString() + RoleResourceEnum.ROLE_ENTITY.toString();
	static readonly viewRoleEntity =
		ActionEnum.VIEW.toString() + RoleResourceEnum.ROLE_ENTITY.toString();
}
