import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	CollectionItemListComponent,
	CollectionItemTableComponent,
} from './component';

@NgModule({
	declarations: [CollectionItemListComponent, CollectionItemTableComponent],
	exports: [CollectionItemListComponent, CollectionItemTableComponent],
	imports: [CommonModule, ButtonModule, ChipModule, TableModule],
})
export class CollectionItemCollectionModule {}
