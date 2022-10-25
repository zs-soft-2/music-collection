import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ArtistFormComponent } from './component';

@NgModule({
	declarations: [ArtistFormComponent],
	exports: [ArtistFormComponent],
	imports: [
		CommonModule,
		ButtonModule,
		FormsModule,
		CalendarModule,
		InputTextareaModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
	],
})
export class ArtistFormModule {}
