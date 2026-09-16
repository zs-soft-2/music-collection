import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { BreadcrumbComponent } from './component/breadcrumb';

@NgModule({
	exports: [BreadcrumbComponent],
	imports: [CommonModule, BreadcrumbComponent],
})
export class BreadcrumbModule {}
