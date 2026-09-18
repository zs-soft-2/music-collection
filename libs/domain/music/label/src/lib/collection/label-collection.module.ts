import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { LabelListComponent, LabelTableComponent } from './component';

@NgModule({
	exports: [LabelListComponent, LabelTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		ChipModule,
		TableModule,
		LabelListComponent,
		LabelTableComponent,
	],
})
export class LabelCollectionModule {}
