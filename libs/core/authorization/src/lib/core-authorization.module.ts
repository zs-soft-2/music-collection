import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CoreAuthorizationDataModule } from './data/core-authorization-data.module';

@NgModule({
  imports: [CommonModule, CoreAuthorizationDataModule],
})
export class CoreAuthorizationModule {}
