import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	LabelDetailViewComponent,
	LabelSimpleViewComponent,
} from './component';

@NgModule({
	imports: [
		CommonModule,
		LabelDetailViewComponent,
		LabelSimpleViewComponent,
	],
})
export class LabelViewModule {}
