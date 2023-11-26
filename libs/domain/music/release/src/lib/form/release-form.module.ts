import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RxLet } from '@rx-angular/template/let';

import { ReleaseFormComponent } from './component';

@NgModule({
	declarations: [ReleaseFormComponent],
	exports: [ReleaseFormComponent],
	imports: [
		CommonModule,
		ButtonModule,
		DropdownModule,
		FormsModule,
		AutoCompleteModule,
		CalendarModule,
		InputTextModule,
		RxLet,
		MultiSelectModule,
		ReactiveFormsModule,
	],
})
export class ReleaseFormModule {}
