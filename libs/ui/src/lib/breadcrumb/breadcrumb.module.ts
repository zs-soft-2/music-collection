import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';
import { RxPush } from '@rx-angular/template/push';

import { BreadcrumbComponent } from './component/breadcrumb';

@NgModule({
	exports: [BreadcrumbComponent],
	declarations: [BreadcrumbComponent],
	imports: [CommonModule, RxLet, RxPush],
})
export class BreadcrumbModule {}
