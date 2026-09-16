import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IsAuthenticatedDirective } from './directive';

@NgModule({
	exports: [IsAuthenticatedDirective],
	imports: [CommonModule, IsAuthenticatedDirective],
})
export class CoreAuthenticationViewModule {}
