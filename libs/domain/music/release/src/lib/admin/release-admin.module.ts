import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReleaseFormModule } from '../form/release-form.module';
import { ReleaseCollectionModule } from '../collection/release-collection.module';
import { ReleaseAdminRoutingModule } from './release-admin-routing.module';
import { ReleaseAdminComponent } from './page/admin';
import { ReleaseEditComponent, ReleaseEditResolverService } from './page/edit';
import {
	ReleaseListPageComponent,
	ReleaseListPageResolverService,
} from './page/list';

@NgModule({
	declarations: [
		ReleaseAdminComponent,
		ReleaseEditComponent,
		ReleaseListPageComponent,
	],
	imports: [
		CommonModule,
		ReleaseAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		ReleaseFormModule,
		ReleaseCollectionModule,
		ButtonModule,
		ToolbarModule,
	],
	providers: [ReleaseEditResolverService, ReleaseListPageResolverService],
})
export class ReleaseAdminModule {}
