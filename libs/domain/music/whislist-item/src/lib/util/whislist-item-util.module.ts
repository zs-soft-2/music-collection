import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WhislistItemUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { WhislistItemUtilServiceImpl } from './service';

@NgModule({
	declarations: [],
	imports: [CommonModule, ReactiveFormsModule],
	providers: [
		{
			provide: WhislistItemUtilService,
			useClass: WhislistItemUtilServiceImpl,
		},
	],
})
export class WhislistItemUtilModule {}
