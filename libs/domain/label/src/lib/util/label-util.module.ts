import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LabelUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { LabelUtilServiceImpl } from './service';

@NgModule({
  declarations: [],
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: LabelUtilService,
      useClass: LabelUtilServiceImpl,
    },
  ],
})
export class LabelUtilModule {}
