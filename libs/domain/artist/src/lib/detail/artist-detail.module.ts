import { ChipModule } from 'primeng/chip';
import { DataViewModule } from 'primeng/dataview';
import { ImageModule } from 'primeng/image';
import { TabMenuModule } from 'primeng/tabmenu';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AlbumItemViewModule } from '@music-collection/domain/album';

import { ArtistDetailViewComponent } from './component';

@NgModule({
	exports: [ArtistDetailViewComponent],
	declarations: [ArtistDetailViewComponent],
	imports: [
		CommonModule,
		AlbumItemViewModule,
		ChipModule,
		DataViewModule,
		FlexLayoutModule,
		ImageModule,
		TabMenuModule,
	],
})
export class ArtistDetailModule {}
