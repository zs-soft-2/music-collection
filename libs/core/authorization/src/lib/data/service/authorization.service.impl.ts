import {
  NgxPermissionsObject,
  NgxPermissionsService,
  NgxRolesObject,
  NgxRolesService,
} from 'ngx-permissions';

import { Injectable } from '@angular/core';
import {
  Action,
  AuthorizationService,
  Resource,
  Role,
} from '@music-collection/api';

@Injectable()
export class AuthorizationServiceImpl extends AuthorizationService {
  public constructor(
    private permissionsService: NgxPermissionsService,
    private rolesService: NgxRolesService
  ) {
    super();
  }

  public addPermission(permission: string): void {
    this.permissionsService.addPermission(permission);
  }

  public addPermissionsByRole(role: Role): void {
    role.permissions?.forEach((permission) => this.addPermission(permission));
  }

  public addPermissionsByRoles(roles: Role[]): void {
    roles.forEach((role) => this.addPermissionsByRole(role));
  }

  public addRole(role: Role): void {
    this.rolesService.addRole(role.name || '', role.permissions || []);
  }

  public addRoles(roles: Role[]): void {
    roles.forEach((role) => {
      this.addRole(role);

      this.addPermissionsByRole(role);
    });
  }

  public generatePermissionName(action: Action, resource: Resource): string {
    return `${action.name}${resource.name}`;
  }

  public hasPermission(permissionName: string): boolean {
    const permissions: NgxPermissionsObject =
      this.permissionsService.getPermissions();

    return !!Object.keys(permissions).find((key) => key === permissionName);
  }

  public hasRole(roleName: string): boolean {
    const roles: NgxRolesObject = this.rolesService.getRoles();

    return !!Object.keys(roles).find((key) => key === roleName);
  }

  public removeAll(): void {
    this.permissionsService.flushPermissions();
    this.rolesService.flushRoles();
  }
}
