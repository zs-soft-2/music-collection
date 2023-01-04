import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';
import { FlexLayoutModule } from '@angular/flex-layout';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LetModule } from '@rx-angular/template/let';

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
		LetModule,
		TableModule,
	],
})
export class CollectionItemCollectionModule {}
