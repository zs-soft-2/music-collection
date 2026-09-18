import { CommonModule } from '@angular/common';
import { NgModule, inject, provideAppInitializer } from '@angular/core';

import { AuthorizationEffects } from './state';

@NgModule({
	imports: [CommonModule],
	providers: [
		AuthorizationEffects,
		// Az effekt a konstruktorában iratkozik fel a munkamenetre, ezért az
		// alkalmazás indulásakor létre kell jönnie.
		provideAppInitializer(() => {
			inject(AuthorizationEffects);
		}),
	],
})
export class CoreAuthorizationStoreModule {}
