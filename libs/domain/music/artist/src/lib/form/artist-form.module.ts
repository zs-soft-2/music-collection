import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { TabsModule } from 'primeng/tabs';

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ArtistAlbumsComponent, ArtistFormComponent } from './component';

@NgModule({
	exports: [ArtistAlbumsComponent, ArtistFormComponent],
	imports: [
		CommonModule,
		AutoCompleteModule,
		ButtonModule,
		SelectModule,
		FormsModule,
		DatePickerModule,
		FileUploadModule,
		HttpClientModule,
		ImageModule,
		TextareaModule,
		InputTextModule,
		MultiSelectModule,
		ReactiveFormsModule,
		TabsModule,
		ArtistAlbumsComponent,
		ArtistFormComponent,
	],
})
export class ArtistFormModule {}
