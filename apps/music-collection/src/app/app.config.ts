import { provideAngularSvgIcon } from 'angular-svg-icon';
import { providePrimeNG } from 'primeng/config';

import { provideHttpClient } from '@angular/common/http';
import {
	APP_INITIALIZER,
	ApplicationConfig,
	importProvidersFrom,
	provideZoneChangeDetection,
} from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideStorage } from '@angular/fire/storage';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { getStorage } from '@firebase/storage';
import { AuthenticationStateService } from '@music-collection/api';
import { CoreAuthenticationModule } from '@music-collection/core/authentication';
import { CoreAuthorizationModule } from '@music-collection/core/authorization';
import { CoreEntityQuantityModule } from '@music-collection/core/entity-quantity';
import { CoreExportImportModule } from '@music-collection/core/export-import';
import { DomainAlbumModule } from '@music-collection/domain/album';
import { DomainArtistModule } from '@music-collection/domain/artist';
import { DomainCollectionItemModule } from '@music-collection/domain/collection-item';
import { DomainDocumentModule } from '@music-collection/domain/document';
import { DomainReleaseModule } from '@music-collection/domain/release';
import { DomainUserModule } from '@music-collection/domain/user';
import { DomainWishlistItemModule } from '@music-collection/domain/wishlist-item';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import Aura from '@primeng/themes/aura';

import { environment } from '../environments/environment';
import { routes } from './app-routing';
import { AuthenticationInitializer } from './initializer';
import { HookModule } from './module/hook';
import { metaReducers } from './reducer';
import {
	AlbumPageResolverService,
	ArtistPageResolverService,
} from './resolver';
import { NgxPermissionsModule } from 'ngx-permissions';

export const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(routes),
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		provideFirestore(() => getFirestore()),
		provideAuth(() => getAuth()),
		provideStorage(() => getStorage()),
		provideHttpClient(),
		provideAngularSvgIcon(),
		provideAnimationsAsync(),
		providePrimeNG({
			theme: {
				preset: Aura,
			},
		}),
		importProvidersFrom(
			StoreModule.forRoot(
				{},
				{
					metaReducers: metaReducers,
					runtimeChecks: {
						strictActionImmutability: true,
						strictStateImmutability: true,
					},
				},
			),
			!environment.production ? StoreDevtoolsModule.instrument() : [],
			EffectsModule.forRoot([]),
      NgxPermissionsModule.forRoot(),
			CoreAuthenticationModule,
			CoreAuthorizationModule,
			CoreEntityQuantityModule,
			CoreExportImportModule,
			DomainUserModule,
			DomainArtistModule,
			DomainAlbumModule,
			DomainCollectionItemModule,
			DomainDocumentModule,
			DomainReleaseModule,
			DomainWishlistItemModule,
			HookModule,
		),
		AlbumPageResolverService,
		ArtistPageResolverService,
		{
			provide: APP_INITIALIZER,
			useFactory: AuthenticationInitializer,
			deps: [AuthenticationStateService],
			multi: true,
		},
	],
};
