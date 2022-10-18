import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IsAuthenticatedDirective } from './directive';

@NgModule({
  declarations: [IsAuthenticatedDirective],
  exports: [IsAuthenticatedDirective],
  imports: [CommonModule],
})
export class CoreAuthenticationViewModule {}
