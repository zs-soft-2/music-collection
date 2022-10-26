import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReleaseUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { ReleaseUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule, ReactiveFormsModule],
	providers: [
		{
			provide: ReleaseUtilService,
			useClass: ReleaseUtilServiceImpl,
		},
	],
})
export class ReleaseUtilModule {}
