import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	ReleaseDetailViewComponent,
	ReleaseSimpleViewComponent,
} from './component';

@NgModule({
	declarations: [ReleaseDetailViewComponent, ReleaseSimpleViewComponent],
	imports: [CommonModule],
})
export class ReleaseViewModule {}
