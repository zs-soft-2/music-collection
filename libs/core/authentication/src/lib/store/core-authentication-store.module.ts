import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	AUTHENTICATION_FEATURE_KEY,
	AuthenticationProviderService,
	AuthenticationStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import {
	AuthenticationEffects,
	AuthenticationStateServiceImpl,
	WebAuthenticationProviderService,
} from './state';
import * as fromAuthentication from './state/authentication.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(
			AUTHENTICATION_FEATURE_KEY,
			fromAuthentication.authenticationReducer
		),
		EffectsModule.forFeature([AuthenticationEffects]),
	],
	providers: [
		{
			provide: AuthenticationStateService,
			useClass: AuthenticationStateServiceImpl,
		},
		// Alapértelmezés a böngészős bejelentkezés. A Capacitor alkalmazás a
		// saját `ApplicationConfig`-jában felülírja a natív változatra.
		{
			provide: AuthenticationProviderService,
			useClass: WebAuthenticationProviderService,
		},
	],
})
export class CoreAuthenticationStoreModule {}
