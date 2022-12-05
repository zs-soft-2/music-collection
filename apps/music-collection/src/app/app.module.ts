import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxPermissionsModule } from 'ngx-permissions';

import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import {
	Auth,
	connectAuthEmulator,
	getAuth,
	provideAuth,
} from '@angular/fire/auth';
import {
	connectFirestoreEmulator,
	Firestore,
	getFirestore,
	provideFirestore,
} from '@angular/fire/firestore';
import {
	connectStorageEmulator,
	getStorage,
	provideStorage,
	Storage,
} from '@angular/fire/storage';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthenticationInitializer } from './initializer';
import { TopBarModule } from './module';
import { HookModule } from './module/hook';
import { metaReducers } from './reducer';
import {
	AlbumPageResolverService,
	ArtistPageResolverService,
} from './resolver';

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		AppRoutingModule,
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		provideFirestore(() => getFirestore()),
		provideAuth(() => getAuth()),
		provideStorage(() => getStorage()),
		HttpClientModule,
		AngularSvgIconModule.forRoot(),
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
		TopBarModule,
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
	],
	providers: [
		AlbumPageResolverService,
		ArtistPageResolverService,
		{
			provide: APP_INITIALIZER,
			useFactory: AuthenticationInitializer,
			deps: [AuthenticationStateService],
			multi: true,
		},
	],
	bootstrap: [AppComponent],
})
export class AppModule {
	public constructor(
		private firestore: Firestore,
		private auth: Auth,
		private storage: Storage
	) {
		if (environment.type === 'develop') {
			connectFirestoreEmulator(this.firestore, 'localhost', 9198);
			connectAuthEmulator(this.auth, 'http://localhost:9199');
			connectStorageEmulator(this.storage, 'localhost', 9195);
		}
	}
}
