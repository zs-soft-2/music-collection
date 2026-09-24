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
import { provideI18n } from '@music-collection/core/i18n';
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

import { AnalyticsService, ShelfLayoutService } from '@music-collection/api';

import { environment } from '../environments/environment';
import { routes } from './app-routing';
import { FirebaseAnalyticsService } from './data/analytics';
// Straight from the file: the page's barrel would pull the lazily loaded
// collection page into the first bundle.
import { CollectorShelfLayoutService } from './page/collection/shelf-layout.service';
import { HookModule } from './module/hook';
import { installPerformanceConsole } from './performance';
import { metaReducers } from './reducer';
import { DefaultLanguageSyncService, LanguageSyncService } from './i18n';
import { AppearanceSyncService, MusicPreset } from './theme';
import { NgxPermissionsModule } from 'ngx-permissions';

/** A gépek, ahol a debug token szóba jöhet: a fejlesztői gép böngészője. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Az App Check debug módja: a token puszta ismerete a bizonyíték, reCAPTCHA
 * pontozás nélkül. Az SDK csak ebből a globálisból indítja el, és csak az
 * `initializeAppCheck` előtt beállítva — ezért áll itt, a provider factory
 * első lépéseként.
 *
 * Prod buildben a token üres (`environment.prod.ts`), a dev környezetet pedig
 * a CI ugyanabból az `environment.ts`-ből telepíti, amiből a `nx serve` dolgozik:
 * ha a token egyszer mégis bekerülne egy telepített build-be, a hostname-feltétel
 * miatt akkor sem szólalna meg a hosting domainjein.
 */
function enableAppCheckDebugToken(): void {
	if (
		environment.production ||
		!environment.appCheck.debugToken ||
		!LOCAL_HOSTS.includes(location.hostname)
	) {
		return;
	}

	(self as unknown as Record<string, unknown>)[
		'FIREBASE_APPCHECK_DEBUG_TOKEN'
	] = environment.appCheck.debugToken;
}

export const appConfig: ApplicationConfig = {
	providers: [
		provideZonelessChangeDetection(),
		provideRouter(routes),
		// Hungarian, English and German. The dictionary is fetched before
		// the first screen, so nothing is ever drawn in the wrong language.
		provideI18n({
			version: environment.version,
			production: environment.production,
		}),
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		// App Check: a callable-ök (apps/functions) App Check tokent követelnek,
		// mert a bejelentkezés önmagában nem mondja meg, hogy a hívás a mi
		// appunkból jön — egy kimásolt ID tokennel a végpontok scriptből is
		// hívhatók lennének, hívásonként egy modell-kérés árán.
		//
		// Site key nélkül nem indítjuk el: az app elfut, de a callable-ök
		// mindent elutasítanak, amíg a kulcs be nem kerül a környezetbe.
		//
		// Localhoston a dev környezet debug tokenje szólal meg, ha a fejlesztő
		// elkérte a tofu-tól (tools/app-check/generate-debug-token.mjs) —
		// enélkül a valódi reCAPTCHA fut, aminek a dev kulcs domainjei között
		// ott a `localhost` (infra/environments/dev/dev.tfvars).
		...(environment.appCheck.recaptchaSiteKey
			? [
					provideAppCheck(() => {
						enableAppCheckDebugToken();

						return initializeAppCheck(getApp(), {
							provider: new ReCaptchaEnterpriseProvider(
								environment.appCheck.recaptchaSiteKey
							),
							isTokenAutoRefreshEnabled: true,
						});
					}),
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
		// The admin form files a copy into the same furniture the shelf page
		// draws: the drawing is a setting of the signed-in collector, which
		// only the app can read.
		{
			provide: ShelfLayoutService,
			useExisting: CollectorShelfLayoutService,
		},
		provideAnimationsAsync(),
		// Carries the look of the app to and from the account. It has to be
		// alive wherever the theme is switched, which is every page, so it
		// starts with the app rather than with the page that shows it.
		provideEnvironmentInitializer(() => inject(AppearanceSyncService)),
		// The same for the language, and alive from the start for the same
		// reason: the switch sits in the top bar, which every page has.
		provideEnvironmentInitializer(() => inject(LanguageSyncService)),
		// And the default an administrator set for everybody, which applies to
		// whoever has not picked one of their own.
		provideEnvironmentInitializer(() => inject(DefaultLanguageSyncService)),
		// Measurement. Nothing is sent — and the analytics SDK is not even
		// fetched — until the collector has allowed it, but the service has to
		// be alive from the start: it follows the navigations and the sign-in
		// state, and neither of those waits for a first event.
		{ provide: AnalyticsService, useExisting: FirebaseAnalyticsService },
		provideEnvironmentInitializer(() => inject(FirebaseAnalyticsService)),
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
