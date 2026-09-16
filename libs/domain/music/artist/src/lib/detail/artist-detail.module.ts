import { ChipModule } from 'primeng/chip';
import { DataViewModule } from 'primeng/dataview';
import { ImageModule } from 'primeng/image';
import { TabsModule } from 'primeng/tabs';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';
import { AlbumItemViewModule } from '@music-collection/domain/album';

import { ArtistDetailViewComponent } from './component';

@NgModule({
	exports: [ArtistDetailViewComponent],
	imports: [
		CommonModule,
		AlbumItemViewModule,
		ChipModule,
		DataViewModule,
		FlexLayoutModule,
		ImageModule,
		TabsModule,
		ArtistDetailViewComponent,
	],
})
export class ArtistDetailModule {}
