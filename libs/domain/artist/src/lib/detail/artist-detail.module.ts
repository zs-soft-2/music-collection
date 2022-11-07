import { ChipModule } from 'primeng/chip';
import { ImageModule } from 'primeng/image';
import { TabMenuModule } from 'primeng/tabmenu';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { ArtistDetailViewComponent } from './component';

@NgModule({
	exports: [ArtistDetailViewComponent],
	declarations: [ArtistDetailViewComponent],
	imports: [
		CommonModule,
		ChipModule,
		FlexLayoutModule,
		ImageModule,
		TabMenuModule,
	],
})
export class ArtistDetailModule {}
