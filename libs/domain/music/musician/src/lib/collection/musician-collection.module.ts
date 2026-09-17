import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MusicianTableComponent } from './component';

@NgModule({
	exports: [MusicianTableComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		ChipModule,
		TableModule,
		MusicianTableComponent,
	],
})
export class MusicianCollectionModule {}
