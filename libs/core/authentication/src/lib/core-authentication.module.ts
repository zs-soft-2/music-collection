import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { getAuth, provideAuth } from '@angular/fire/auth';

import { CoreAuthenticationStoreModule } from './store/core-authentication-store.module';
import { CoreAuthenticationViewModule } from './view/core-authentication-view.module';

@NgModule({
	exports: [CoreAuthenticationStoreModule, CoreAuthenticationViewModule],
	imports: [
		CommonModule,
		provideAuth(() => getAuth()),
		CoreAuthenticationStoreModule,
		CoreAuthenticationViewModule,
	],
})
export class CoreAuthenticationModule {}
