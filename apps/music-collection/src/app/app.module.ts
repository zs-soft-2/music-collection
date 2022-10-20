import { NgxPermissionsModule } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CoreAuthenticationModule } from '@music-collection/core/authentication';
import { CoreAuthorizationModule } from '@music-collection/core/authorization';
import { DomainUserModule } from '@music-collection/domain/user';
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
    AppRoutingModule,
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
    DomainUserModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
