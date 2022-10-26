import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { LabelListComponent, LabelTableComponent } from './component';

@NgModule({
	declarations: [LabelListComponent, LabelTableComponent],
	exports: [LabelListComponent, LabelTableComponent],
	imports: [CommonModule, ButtonModule, ChipModule, TableModule],
})
export class LabelCollectionModule {}
