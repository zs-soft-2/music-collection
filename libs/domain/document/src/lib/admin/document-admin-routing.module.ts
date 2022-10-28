import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { DocumentAdminComponent } from './page/admin';
import {
	DocumentEditComponent,
	DocumentEditResolverService,
} from './page/edit';
import {
	DocumentListPageComponent,
	DocumentListPageResolverService,
} from './page/list';
import { DocumentAdminPermissionsService } from './service';

const routes: Routes = [
	{
		path: '',
		component: DocumentAdminComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'list',
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: DocumentEditComponent,
				data: {
					breadcrumb: 'edit',
					permissions: {
						only: [
							RoleNames.ADMIN,
							DocumentAdminPermissionsService.viewDocumentEditPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'edit/:documentId',
				pathMatch: 'full',
				resolve: { data: DocumentEditResolverService },
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: DocumentListPageComponent,
				data: {
					breadcrumb: 'list',
					permissions: {
						only: [
							RoleNames.ADMIN,
							DocumentAdminPermissionsService.viewDocumentListPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'list',
				pathMatch: 'full',
				resolve: { data: DocumentListPageResolverService },
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class DocumentAdminRoutingModule {}
