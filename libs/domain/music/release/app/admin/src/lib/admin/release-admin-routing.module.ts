import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { ReleaseAdminComponent } from './page/admin';
import { ReleaseEditComponent, ReleaseEditResolverService } from './page/edit';
import {
	ReleaseListPageComponent,
	ReleaseListPageResolverService,
} from './page/list';
import { ReleaseAdminPermissionsService } from './service';

const routes: Routes = [
	{
		path: '',
		component: ReleaseAdminComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'list',
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: ReleaseEditComponent,
				data: {
					breadcrumb: 'edit',
					permissions: {
						only: [
							RoleNames.ADMIN,
							ReleaseAdminPermissionsService.viewReleaseEditPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'edit/:releaseId',
				pathMatch: 'full',
				resolve: { data: ReleaseEditResolverService },
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: ReleaseListPageComponent,
				data: {
					breadcrumb: 'list',
					permissions: {
						only: [
							RoleNames.ADMIN,
							ReleaseAdminPermissionsService.viewReleaseListPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'list',
				pathMatch: 'full',
				resolve: { data: ReleaseListPageResolverService },
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ReleaseAdminRoutingModule {}
