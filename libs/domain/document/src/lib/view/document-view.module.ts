import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	DocumentDetailViewComponent,
	DocumentSimpleViewComponent,
} from './component';

@NgModule({
	declarations: [DocumentDetailViewComponent, DocumentSimpleViewComponent],
	imports: [CommonModule],
})
export class DocumentViewModule {}
