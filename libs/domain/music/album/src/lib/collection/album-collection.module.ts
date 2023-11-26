import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';

import { AlbumSimpleViewModule } from '../view/simple';
import { AlbumListComponent, AlbumTableComponent } from './component';

@NgModule({
	declarations: [AlbumListComponent, AlbumTableComponent],
	exports: [AlbumListComponent, AlbumTableComponent],
	imports: [
		CommonModule,
		AlbumSimpleViewModule,
		AutoCompleteModule,
		ButtonModule,
		CarouselModule,
		ChipModule,
		RxLet,
		TableModule,
	],
})
export class AlbumCollectionModule {}
