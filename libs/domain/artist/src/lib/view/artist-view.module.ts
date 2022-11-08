import { ChipModule } from 'primeng/chip';
import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LetModule } from '@rx-angular/template';

import { ArtistSimpleViewComponent } from './component';

@NgModule({
	exports: [ArtistSimpleViewComponent],
	declarations: [ArtistSimpleViewComponent],
	imports: [
		CommonModule,
		ChipModule,
		FlexLayoutModule,
		ImageModule,
		LetModule,
	],
})
export class ArtistViewModule {}
