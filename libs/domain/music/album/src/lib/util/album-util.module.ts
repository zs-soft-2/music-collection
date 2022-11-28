import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { AlbumUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule, ReactiveFormsModule],
	providers: [
		{
			provide: AlbumUtilService,
			useClass: AlbumUtilServiceImpl,
		},
	],
})
export class AlbumUtilModule {}
