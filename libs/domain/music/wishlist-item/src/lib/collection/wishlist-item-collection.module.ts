import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { DataViewModule } from 'primeng/dataview';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LetModule } from '@rx-angular/template/let';

import { WishlistItemViewModule } from '../view/wishlist-item-view.module';
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
		DataViewModule,
		FlexLayoutModule,
		LetModule,
		TableModule,
		WishlistItemViewModule,
	],
})
export class WishlistItemCollectionModule {}
