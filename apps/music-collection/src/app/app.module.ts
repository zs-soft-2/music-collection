import { NgxPermissionsModule } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreAuthenticationModule } from '@music-collection/core/authentication';
import { CoreAuthorizationModule } from '@music-collection/core/authorization';
import { CoreEntityQuantityModule } from '@music-collection/core/entity-quantity';
import { DomainAlbumModule } from '@music-collection/domain/album';
import { DomainArtistModule } from '@music-collection/domain/artist';

import { DomainUserModule } from '@music-collection/domain/user';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TopBarModule } from './module';
import { HookModule } from './module/hook';
import { ArtistPageResolverService } from './resolver';
import { metaReducers } from './reducer';

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		AppRoutingModule,
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		provideFirestore(() => getFirestore()),
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
		DomainUserModule,
		DomainArtistModule,
		DomainAlbumModule,
		HookModule,
	],
	providers: [ArtistPageResolverService],
	bootstrap: [AppComponent],
})
export class AppModule {}
