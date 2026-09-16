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
import { RxLet } from '@rx-angular/template/let';

import { ArtistFormComponent } from './component';

@NgModule({
	declarations: [ArtistFormComponent],
	exports: [ArtistFormComponent],
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
		RxLet,
		MultiSelectModule,
		ReactiveFormsModule,
		TabsModule,
	],
})
export class ArtistFormModule {}
