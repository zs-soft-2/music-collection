import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumDataService } from '@music-collection/api';

import { AlbumDataServiceImpl } from './service';

@NgModule({
  imports: [CommonModule],
  providers: [
    {
      provide: AlbumDataService,
      useClass: AlbumDataServiceImpl,
    },
  ],
})
export class AlbumDataModule {}
