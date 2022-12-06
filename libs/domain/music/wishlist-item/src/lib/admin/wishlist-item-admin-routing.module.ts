import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { WishlistItemAdminComponent } from './page/admin';
import {
	WishlistItemEditComponent,
	WishlistItemEditResolverService,
} from './page/edit';
import {
	WishlistItemListPageComponent,
	WishlistItemListPageResolverService,
} from './page/list';
import { WishlistItemAdminPermissionsService } from './service';

const routes: Routes = [
	{
		path: '',
		component: WishlistItemAdminComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'list',
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: WishlistItemEditComponent,
				data: {
					breadcrumb: 'edit',
					permissions: {
						only: [
							RoleNames.ADMIN,
							WishlistItemAdminPermissionsService.viewWishlistItemEditPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'edit/:wishlistItemId',
				pathMatch: 'full',
				resolve: { data: WishlistItemEditResolverService },
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: WishlistItemListPageComponent,
				data: {
					breadcrumb: 'list',
					permissions: {
						only: [
							RoleNames.ADMIN,
							WishlistItemAdminPermissionsService.viewWishlistItemListPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'list',
				pathMatch: 'full',
				resolve: { data: WishlistItemListPageResolverService },
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class WishlistItemAdminRoutingModule {}
