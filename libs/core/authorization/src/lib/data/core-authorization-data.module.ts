import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	AuthorizationService,
	EffectivePermissionsDataService,
} from '@music-collection/api';

import {
	AuthorizationServiceImpl,
	EffectivePermissionsDataServiceImpl,
} from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: AuthorizationService,
			useClass: AuthorizationServiceImpl,
		},
		{
			provide: EffectivePermissionsDataService,
			useClass: EffectivePermissionsDataServiceImpl,
		},
	],
})
export class CoreAuthorizationDataModule {}
