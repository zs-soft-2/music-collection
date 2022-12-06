import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LetModule } from '@rx-angular/template';

import {
	WishlistItemListComponent,
	WishlistItemTableComponent,
} from './component';

@NgModule({
	declarations: [WishlistItemListComponent, WishlistItemTableComponent],
	exports: [WishlistItemListComponent, WishlistItemTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		CarouselModule,
		ChipModule,
		LetModule,
		TableModule,
	],
})
export class WishlistItemCollectionModule {}
