import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';

import { LabelListComponent, LabelTableComponent } from './component';

@NgModule({
	declarations: [LabelListComponent, LabelTableComponent],
	exports: [LabelListComponent, LabelTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		ChipModule,
		RxLet,
		TableModule,
	],
})
export class LabelCollectionModule {}
