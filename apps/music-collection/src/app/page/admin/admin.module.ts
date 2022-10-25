import { MenuModule } from 'primeng/menu';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';

@NgModule({
	declarations: [AdminComponent],
	imports: [CommonModule, AdminRoutingModule, FlexLayoutModule, MenuModule],
})
export class AdminModule {}
