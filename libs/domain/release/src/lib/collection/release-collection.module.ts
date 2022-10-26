import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReleaseListComponent, ReleaseTableComponent } from './component';

@NgModule({
	declarations: [ReleaseListComponent, ReleaseTableComponent],
	exports: [ReleaseListComponent, ReleaseTableComponent],
	imports: [CommonModule, ButtonModule, ChipModule, TableModule],
})
export class ReleaseCollectionModule {}
