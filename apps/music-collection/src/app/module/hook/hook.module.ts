import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	AlbumHookService,
	ArtistHookService,
	UserHookService,
} from '@music-collection/api';

import { MCAlbumHookService } from './album';
import { MCArtistHookService } from './artist';
import { MCUserHookService } from './user';

@NgModule({
	exports: [],
	declarations: [],
	imports: [CommonModule],
	providers: [
		{
			provide: AlbumHookService,
			useClass: MCAlbumHookService,
		},
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
