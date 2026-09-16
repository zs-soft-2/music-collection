import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CollectionItemFormComponent } from './component';

@NgModule({
	declarations: [CollectionItemFormComponent],
	exports: [CollectionItemFormComponent],
	imports: [
		CommonModule,
		ButtonModule,
		FormsModule,
		AutoCompleteModule,
		DatePickerModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
	],
})
export class CollectionItemFormModule {}
