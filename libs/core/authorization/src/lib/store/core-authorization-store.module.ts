import { firstValueFrom, of, switchMap, take, timeout } from 'rxjs';

import { CommonModule } from '@angular/common';
import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';

import { AuthorizationEffects } from './state';

/** Ennyi ideig várunk induláskor a jogosultságokra (pl. offline Firestore). */
const PERMISSIONS_READY_TIMEOUT_MS = 10_000;

@NgModule({
	imports: [CommonModule],
	providers: [
		AuthorizationEffects,
		// Az effekt a konstruktorában iratkozik fel a munkamenetre, ezért az
		// alkalmazás indulásakor létre kell jönnie. Oldal-újratöltéskor a
		// Firebase aszinkron állítja vissza a munkamenetet: amíg a
		// bejelentkezett user jogosultságai meg nem érkeznek, az indulás vár,
		// különben a védett route-ok (pl. /admin) guardja üres szerepkör-
		// listával futna, és az /error oldalra irányítana.
		provideAppInitializer(() => {
			const effects = inject(AuthorizationEffects);

			return firstValueFrom(
				authState(inject(Auth)).pipe(
					take(1),
					switchMap((user) =>
						user ? effects.appliedFor$(user.uid) : of(undefined)
					),
					timeout({
						first: PERMISSIONS_READY_TIMEOUT_MS,
						with: () => of(undefined),
					})
				)
			);
		}),
	],
})
export class CoreAuthorizationStoreModule {}
