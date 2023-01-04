import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LetModule } from '@rx-angular/template/let';
import { PushModule } from '@rx-angular/template/push';

import { BreadcrumbComponent } from './component/breadcrumb';

@NgModule({
	exports: [BreadcrumbComponent],
	declarations: [BreadcrumbComponent],
	imports: [CommonModule, LetModule, PushModule],
})
export class BreadcrumbModule {}
