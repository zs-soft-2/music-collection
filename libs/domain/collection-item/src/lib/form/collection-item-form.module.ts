import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LetModule } from '@rx-angular/template';

import { CollectionItemFormComponent } from './component';

@NgModule({
	declarations: [CollectionItemFormComponent],
	exports: [CollectionItemFormComponent],
	imports: [
		CommonModule,
		ButtonModule,
		FormsModule,
		AutoCompleteModule,
		CalendarModule,
		InputTextModule,
		LetModule,
		MultiSelectModule,
		ReactiveFormsModule,
	],
})
export class CollectionItemFormModule {}
