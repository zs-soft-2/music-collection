import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TabsModule } from 'primeng/tabs';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AlbumFormComponent } from './component';

@NgModule({
	declarations: [AlbumFormComponent],
	exports: [AlbumFormComponent],
	imports: [
		CommonModule,
		ButtonModule,
		FormsModule,
		AutoCompleteModule,
		DatePickerModule,
		SelectModule,
		ImageModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
		TabsModule,
	],
})
export class AlbumFormModule {}
