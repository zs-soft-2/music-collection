import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ReleaseFormComponent, ReleaseTracksComponent } from './component';

@NgModule({
	exports: [ReleaseFormComponent, ReleaseTracksComponent],
	imports: [
		CommonModule,
		ButtonModule,
		SelectModule,
		FormsModule,
		AutoCompleteModule,
		DatePickerModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
		ReleaseFormComponent,
		ReleaseTracksComponent,
	],
})
export class ReleaseFormModule {}
