import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { TabViewModule } from 'primeng/tabview';

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ArtistFormComponent } from './component';

@NgModule({
	declarations: [ArtistFormComponent],
	exports: [ArtistFormComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		FormsModule,
		CalendarModule,
		FileUploadModule,
		HttpClientModule,
		ImageModule,
		InputTextareaModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
		TabViewModule,
	],
})
export class ArtistFormModule {}
