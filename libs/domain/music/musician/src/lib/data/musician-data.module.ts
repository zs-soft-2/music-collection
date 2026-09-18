import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MusicianDataService } from '@music-collection/api';

import { MusicianDataServiceImpl } from './service';

@NgModule({
	imports: [CommonModule],
	providers: [
		{
			provide: MusicianDataService,
			useClass: MusicianDataServiceImpl,
		},
	],
})
export class MusicianDataModule {}
