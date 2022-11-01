import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumViewModule } from '../view/album-view.module';
import { AlbumListComponent, AlbumTableComponent } from './component';

@NgModule({
	declarations: [AlbumListComponent, AlbumTableComponent],
	exports: [AlbumListComponent, AlbumTableComponent],
	imports: [
		CommonModule,
		AlbumViewModule,
		AutoCompleteModule,
		ButtonModule,
		CarouselModule,
		ChipModule,
		TableModule,
	],
})
export class AlbumCollectionModule {}
