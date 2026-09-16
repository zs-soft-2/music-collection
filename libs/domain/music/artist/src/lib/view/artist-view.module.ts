import { ChipModule } from 'primeng/chip';
import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';

import { ArtistSimpleViewComponent } from './component';

@NgModule({
	exports: [ArtistSimpleViewComponent],
	declarations: [ArtistSimpleViewComponent],
	imports: [
		CommonModule,
		ChipModule,
		FlexLayoutModule,
		ImageModule,
	],
})
export class ArtistViewModule {}
