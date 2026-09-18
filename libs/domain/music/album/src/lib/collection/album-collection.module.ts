import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumSimpleViewModule } from '../view/simple';
import { AlbumListComponent, AlbumTableComponent } from './component';

@NgModule({
	exports: [AlbumListComponent, AlbumTableComponent],
	imports: [
		CommonModule,
		AlbumSimpleViewModule,
		AutoCompleteModule,
		ButtonModule,
		CarouselModule,
		ChipModule,
		TableModule,
		AlbumListComponent,
		AlbumTableComponent,
	],
})
export class AlbumCollectionModule {}
