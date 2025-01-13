import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';

import { CollectionItemViewModule } from '../view/collection-item-view.module';
import {
	CollectionItemListComponent,
	CollectionItemTableComponent,
} from './component';

@NgModule({
	declarations: [CollectionItemListComponent, CollectionItemTableComponent],
	exports: [CollectionItemListComponent, CollectionItemTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		CarouselModule,
		CollectionItemViewModule,
		ButtonModule,
		ChipModule,
		FlexLayoutModule,
		TableModule,
		ProgressSpinnerModule,
	],
})
export class CollectionItemCollectionModule {}
