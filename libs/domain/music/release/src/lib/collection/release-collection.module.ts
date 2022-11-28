import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LetModule } from '@rx-angular/template';

import { ReleaseViewModule } from '../view/release-view.module';
import { ReleaseListComponent, ReleaseTableComponent } from './component';

@NgModule({
	declarations: [ReleaseListComponent, ReleaseTableComponent],
	exports: [ReleaseListComponent, ReleaseTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		CarouselModule,
		ButtonModule,
		ChipModule,
		LetModule,
		ReleaseViewModule,
		TableModule,
	],
})
export class ReleaseCollectionModule {}
