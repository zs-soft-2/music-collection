import { Observable, Subscription, catchError, of, switchMap } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { Injectable, OnDestroy, inject } from '@angular/core';
import {
	AuthenticationStateService,
	AuthorizationService,
	EffectivePermissions,
	EffectivePermissionsDataService,
} from '@music-collection/api';

const EMPTY_PERMISSIONS: EffectivePermissions = { permissions: [], roles: [] };

/**
 * A kliens jogosultságai a bejelentkezett user
 * `security/users/{uid}/effective_permissions` dokumentumából jönnek —
 * ugyanabból, amit a firestore.rules és a storage.rules ellenőriz. Így az
 * ngx-permissions alapján rajzolt felület és a szerver döntése nem tud
 * szétcsúszni.
 *
 * Élő listener: a szerepkör megváltozása újratöltés nélkül is megjelenik.
 * Kijelentkezéskor mindent kiürítünk.
 */
@Injectable()
export class AuthorizationEffects implements OnDestroy {
	private authenticationStateService = inject(AuthenticationStateService);
	private authorizationService = inject(AuthorizationService);
	private effectivePermissionsDataService = inject(
		EffectivePermissionsDataService
	);

	private subscription = new Subscription();

	public constructor() {
		this.subscription = this.authenticatedUid$()
			.pipe(
				switchMap((uid) =>
					uid
						? this.effectivePermissions$(uid)
						: of(EMPTY_PERMISSIONS)
				)
			)
			.subscribe((effective) => this.apply(effective));
	}

	public ngOnDestroy(): void {
		this.subscription.unsubscribe();
	}

	private authenticatedUid$(): Observable<string | undefined> {
		return this.authenticationStateService.selectAuthenticatedUser$().pipe(
			map((user) => user?.uid || undefined),
			distinctUntilChanged()
		);
	}

	private effectivePermissions$(
		uid: string
	): Observable<EffectivePermissions> {
		return this.effectivePermissionsDataService.load$(uid).pipe(
			map((effective) => effective ?? EMPTY_PERMISSIONS),
			// Kijelentkezés pillanatában (és jogosultság nélkül) a dokumentum
			// olvasása tiltott — ilyenkor egyszerűen nincs permission.
			catchError(() => of(EMPTY_PERMISSIONS))
		);
	}

	private apply(effective: EffectivePermissions): void {
		this.authorizationService.removeAll();

		// A permissionöket a szerver már egyesítette a szerepkörökből, ezért a
		// szerepkörnév csak címke: az ellenőrzés a permission-listán megy.
		effective.roles.forEach((role) =>
			this.authorizationService.addRole({
				uid: role,
				name: role,
				permissions: [],
			})
		);
		effective.permissions.forEach((permission) =>
			this.authorizationService.addPermission(permission)
		);
	}
}
