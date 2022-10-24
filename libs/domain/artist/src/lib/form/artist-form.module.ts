import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';

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
    InputTextModule,
    ReactiveFormsModule,
  ],
})
export class ArtistFormModule {}
