import { BaseService } from '../../../common';
import { Action } from '../../action';
import { Resource } from '../../resource';
import { Role } from '../../role';

export abstract class AuthorizationService extends BaseService {
	public abstract addPermission(permission: string): void;
	public abstract addPermissionsByRoles(roles: Role[]): void;
	public abstract addRole(role: Role): void;
	public abstract addRoles(roles: Role[]): void;
	public abstract generatePermissionName(
		action: Action,
		resource: Resource
	): string;
	public abstract hasPermission(permissionName: string): boolean;
	public abstract hasRole(roleName: string): boolean;
	public abstract removeAll(): void;
}
