import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CoreAuthenticationStoreModule } from './store/core-authentication-store.module';
import { CoreAuthenticationViewModule } from './view/core-authentication-view.module';

@NgModule({
  exports: [CoreAuthenticationStoreModule, CoreAuthenticationViewModule],
  imports: [
    CommonModule,
    CoreAuthenticationStoreModule,
    CoreAuthenticationViewModule,
  ],
})
export class CoreAuthenticationModule {}
