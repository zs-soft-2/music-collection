import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { UserStateService } from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { UserStateServiceImpl } from './state/user-state.service.impl';
import { UserEffects } from './state/user.effects';
import * as fromUser from './state/user.reducer';

@NgModule({
	imports: [
		CommonModule,
		StoreModule.forFeature(fromUser.USER_FEATURE_KEY, fromUser.reducer),
		EffectsModule.forFeature([UserEffects]),
	],
	providers: [
		{
			provide: UserStateService,
			useClass: UserStateServiceImpl,
		},
	],
})
export class UserStoreModule {}
