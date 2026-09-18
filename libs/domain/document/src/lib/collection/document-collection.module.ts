import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DocumentListComponent, DocumentTableComponent } from './component';

@NgModule({
	exports: [DocumentListComponent, DocumentTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		ChipModule,
		TableModule,
		DocumentListComponent,
		DocumentTableComponent,
	],
})
export class DocumentCollectionModule {}
