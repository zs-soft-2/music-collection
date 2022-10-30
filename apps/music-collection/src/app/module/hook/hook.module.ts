import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ArtistHookService, UserHookService } from '@music-collection/api';

import { MCArtistHookService } from './artist';
import { MCUserHookService } from './user';

@NgModule({
	exports: [],
	declarations: [],
	imports: [CommonModule],
	providers: [
		{
			provide: ArtistHookService,
			useClass: MCArtistHookService,
		},
		{
			provide: UserHookService,
			useClass: MCUserHookService,
		},
	],
})
export class HookModule {}
