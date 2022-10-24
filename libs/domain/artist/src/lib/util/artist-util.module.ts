import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ArtistUtilService } from '@music-collection/api';
import { ReactiveFormsModule } from '@angular/forms';

import { ArtistUtilServiceImpl } from './service';

@NgModule({
  declarations: [],
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: ArtistUtilService,
      useClass: ArtistUtilServiceImpl,
    },
  ],
})
export class ArtistUtilModule {}
