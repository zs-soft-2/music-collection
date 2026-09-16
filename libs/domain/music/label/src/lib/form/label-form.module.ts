import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LabelFormComponent } from './component';

@NgModule({
	declarations: [LabelFormComponent],
	exports: [LabelFormComponent],
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
export class LabelFormModule {}
