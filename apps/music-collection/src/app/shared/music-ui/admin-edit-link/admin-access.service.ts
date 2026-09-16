import { combineLatest, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RoleNames } from '@music-collection/api';
import { NgxPermissionsService, NgxRolesService } from 'ngx-permissions';

/**
 * Az aktuális felhasználó admin-e — egyetlen, az egész app által megosztott
 * jel. Ugyanazt nézi, mint az admin route őre: ADMIN szerepkör vagy
 * jogosultság.
 */
@Injectable({ providedIn: 'root' })
export class AdminAccessService {
	private readonly permissionsService = inject(NgxPermissionsService);
	private readonly rolesService = inject(NgxRolesService);

	public readonly isAdmin = toSignal(
		combineLatest([
			this.permissionsService.permissions$,
			this.rolesService.roles$,
		]).pipe(
			map(
				([permissions, roles]) =>
					RoleNames.ADMIN in permissions || RoleNames.ADMIN in roles
			)
		),
		{ initialValue: false }
	);
}
