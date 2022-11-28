import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { CollectionItemAdminComponent } from './page/admin';
import {
	CollectionItemEditComponent,
	CollectionItemEditResolverService,
} from './page/edit';
import {
	CollectionItemListPageComponent,
	CollectionItemListPageResolverService,
} from './page/list';
import { CollectionItemAdminPermissionsService } from './service';

const routes: Routes = [
	{
		path: '',
		component: CollectionItemAdminComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'list',
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: CollectionItemEditComponent,
				data: {
					breadcrumb: 'edit',
					permissions: {
						only: [
							RoleNames.ADMIN,
							CollectionItemAdminPermissionsService.viewCollectionItemEditPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'edit/:collectionItemId',
				pathMatch: 'full',
				resolve: { data: CollectionItemEditResolverService },
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: CollectionItemListPageComponent,
				data: {
					breadcrumb: 'list',
					permissions: {
						only: [
							RoleNames.ADMIN,
							CollectionItemAdminPermissionsService.viewCollectionItemListPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'list',
				pathMatch: 'full',
				resolve: { data: CollectionItemListPageResolverService },
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class CollectionItemAdminRoutingModule {}
