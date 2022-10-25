import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	LabelDetailViewComponent,
	LabelSimpleViewComponent,
} from './component';

@NgModule({
	declarations: [LabelDetailViewComponent, LabelSimpleViewComponent],
	imports: [CommonModule],
})
export class LabelViewModule {}
