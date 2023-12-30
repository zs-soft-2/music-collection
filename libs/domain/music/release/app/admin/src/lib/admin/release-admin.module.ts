import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	ReleaseCollectionModule,
	ReleaseFormModule,
} from '@music-collection/domain/release';

import { ReleaseAdminComponent } from './page/admin';
import { ReleaseEditComponent, ReleaseEditResolverService } from './page/edit';
import {
	ReleaseListPageComponent,
	ReleaseListPageResolverService,
} from './page/list';
import { ReleaseAdminRoutingModule } from './release-admin-routing.module';

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
