import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	DocumentDetailViewComponent,
	DocumentSimpleViewComponent,
} from './component';

@NgModule({
	imports: [
		CommonModule,
		DocumentDetailViewComponent,
		DocumentSimpleViewComponent,
	],
})
export class DocumentViewModule {}
