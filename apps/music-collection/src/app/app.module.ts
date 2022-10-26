import { NgxPermissionsModule } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreAuthenticationModule } from '@music-collection/core/authentication';
import { CoreAuthorizationModule } from '@music-collection/core/authorization';
import { CoreEntityQuantityModule } from '@music-collection/core/entity-quantity';
import { DomainAlbumModule } from '@music-collection/domain/album';
import { DomainArtistModule } from '@music-collection/domain/artist';
import { DomainCollectionItemModule } from '@music-collection/domain/collection-item';
import { DomainLabelModule } from '@music-collection/domain/label';
import { DomainReleaseModule } from '@music-collection/domain/release';
import { DomainUserModule } from '@music-collection/domain/user';
import { BreadcrumbModule } from '@music-collection/ui';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TopBarModule } from './module';

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		AppRoutingModule,
		BreadcrumbModule,
		StoreModule.forRoot(
			{},
			{
				metaReducers: !environment.production ? [] : [],
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
		DomainLabelModule,
		DomainReleaseModule,
		DomainCollectionItemModule,
	],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule {}
