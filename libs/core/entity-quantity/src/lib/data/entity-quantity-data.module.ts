import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EntityQuantityDataService } from '@music-collection/api';

import { EntityQuantityDataServiceImpl } from './service';

@NgModule({
  imports: [CommonModule],
  providers: [
    {
      provide: EntityQuantityDataService,
      useClass: EntityQuantityDataServiceImpl,
    },
  ],
})
export class EntityQuantityDataModule {}
