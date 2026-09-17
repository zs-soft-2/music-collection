import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MusicianUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { MusicianUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule, ReactiveFormsModule],
	providers: [
		{
			provide: MusicianUtilService,
			useClass: MusicianUtilServiceImpl,
		},
	],
})
export class MusicianUtilModule {}
