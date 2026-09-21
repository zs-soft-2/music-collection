import { provideAngularSvgIcon } from 'angular-svg-icon';
import { providePrimeNG } from 'primeng/config';

import { provideHttpClient, withXhr } from '@angular/common/http';
import {
	ApplicationConfig,
	importProvidersFrom,
	inject,
	provideEnvironmentInitializer,
	provideZonelessChangeDetection,
} from '@angular/core';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { initializeAppCheck, provideAppCheck } from '@angular/fire/app-check';
import { getAuth, provideAuth } from '@angular/fire/auth';
import {
	CACHE_SIZE_UNLIMITED,
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
	provideFirestore,
} from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { provideStorage } from '@angular/fire/storage';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getStorage } from 'firebase/storage';
import { CoreAuthenticationModule } from '@music-collection/core/authentication';
import { CoreAuthorizationModule } from '@music-collection/core/authorization';
import { CoreEntityQuantityModule } from '@music-collection/core/entity-quantity';
import { CoreErrorModule } from '@music-collection/core/error';
import { CoreExportImportModule } from '@music-collection/core/export-import';
import { DomainAlbumModule } from '@music-collection/domain/album';
import { DomainArtistModule } from '@music-collection/domain/artist';
import { DomainCollectionItemModule } from '@music-collection/domain/collection-item';
import { DomainDocumentModule } from '@music-collection/domain/document';
import { provideMusicCollection } from '@music-collection/domain/music-collection/core';
import { DomainReleaseModule } from '@music-collection/domain/release';
import { DomainUserModule } from '@music-collection/domain/user';
import { DomainWishlistItemModule } from '@music-collection/domain/wishlist-item';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { environment } from '../environments/environment';
import { routes } from './app-routing';
import { HookModule } from './module/hook';
import { installPerformanceConsole } from './performance';
import { metaReducers } from './reducer';
import { AppearanceSyncService, MusicPreset } from './theme';
import { NgxPermissionsModule } from 'ngx-permissions';

export const appConfig: ApplicationConfig = {
	providers: [
		provideZonelessChangeDetection(),
		provideRouter(routes),
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		// App Check: a callable-ök (apps/functions) App Check tokent követelnek,
		// mert a bejelentkezés önmagában nem mondja meg, hogy a hívás a mi
		// appunkból jön — egy kimásolt ID tokennel a végpontok scriptből is
		// hívhatók lennének, hívásonként egy modell-kérés árán.
		//
		// Site key nélkül nem indítjuk el: az app elfut, de a callable-ök
		// mindent elutasítanak, amíg a kulcs be nem kerül a környezetbe.
		//
		// Localhoston is a valódi reCAPTCHA fut: a dev kulcs domainjei között
		// ott a `localhost` (infra/environments/dev/dev.tfvars), így nem kell
		// debug tokent regisztrálni a fejlesztéshez.
		...(environment.appCheck.recaptchaSiteKey
			? [
					provideAppCheck(() =>
						initializeAppCheck(getApp(), {
							provider: new ReCaptchaEnterpriseProvider(
								environment.appCheck.recaptchaSiteKey
							),
							isTokenAutoRefreshEnabled: true,
						})
					),
				]
			: []),
		provideFirestore(() =>
			// Persistent (IndexedDB) cache, shared by the tabs. Unlimited size:
			// the sync cache (FirestoreSyncService) relies on nothing being
			// garbage collected.
			initializeFirestore(getApp(), {
				localCache: persistentLocalCache({
					cacheSizeBytes: CACHE_SIZE_UNLIMITED,
					tabManager: persistentMultipleTabManager(),
				}),
			})
		),
		provideAuth(() => getAuth()),
		// The callables run where the Firestore database is (apps/functions).
		provideFunctions(() => getFunctions(getApp(), 'europe-west4')),
		provideStorage(() => getStorage()),
		provideHttpClient(withXhr()),
		provideAngularSvgIcon(),
		provideMusicCollection(),
		provideAnimationsAsync(),
		// Carries the look of the app to and from the account. It has to be
		// alive wherever the theme is switched, which is every page, so it
		// starts with the app rather than with the page that shows it.
		provideEnvironmentInitializer(() => inject(AppearanceSyncService)),
		// `__mcPerf` in the console: the timings of the heavy work, in every
		// build, so a slow machine's numbers can be read where it is slow.
		provideEnvironmentInitializer(() => installPerformanceConsole()),
		providePrimeNG({
			theme: {
				preset: MusicPreset,
				options: {
					darkModeSelector: '.mc-dark',
				},
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
				}
			),
			!environment.production ? StoreDevtoolsModule.instrument() : [],
			EffectsModule.forRoot([]),
			NgxPermissionsModule.forRoot(),
			// Elsőként: a globális ErrorHandler a többi modul indulását is fedi.
			CoreErrorModule,
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
			HookModule
		),
	],
};
