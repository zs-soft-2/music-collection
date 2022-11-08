import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LetModule, PushModule } from '@rx-angular/template';

import { BreadcrumbComponent } from './component/breadcrumb';

@NgModule({
	exports: [BreadcrumbComponent],
	declarations: [BreadcrumbComponent],
	imports: [CommonModule, LetModule, PushModule],
})
export class BreadcrumbModule {}
