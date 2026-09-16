import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArtistViewModule } from '../view/artist-view.module';
import { ArtistListComponent, ArtistTableComponent } from './component';

@NgModule({
	declarations: [ArtistListComponent, ArtistTableComponent],
	exports: [ArtistListComponent, ArtistTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		CarouselModule,
		ChipModule,
		TableModule,
		ArtistViewModule,
	],
})
export class ArtistCollectionModule {}
