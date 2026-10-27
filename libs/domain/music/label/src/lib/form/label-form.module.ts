import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LabelFormComponent } from './component';

@NgModule({
	exports: [LabelFormComponent],
	imports: [
		CommonModule,
		ButtonModule,
		CheckboxModule,
		DialogModule,
		FormsModule,
		AutoCompleteModule,
		DatePickerModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
		TextareaModule,
		LabelFormComponent,
	],
})
export class LabelFormModule {}
