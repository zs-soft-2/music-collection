import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { ArtistAdminComponent } from './page/admin';
import { ArtistEditComponent, ArtistEditResolverService } from './page/edit';
import {
	ArtistListPageComponent,
	ArtistListPageResolverService,
} from './page/list';
import { ArtistAdminPermissionsService } from './service';

const routes: Routes = [
	{
		path: '',
		component: ArtistAdminComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'list',
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: ArtistEditComponent,
				data: {
					breadcrumb: 'edit',
					permissions: {
						only: [
							RoleNames.ADMIN,
							ArtistAdminPermissionsService.viewArtistEditPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'edit/:artistId',
				pathMatch: 'full',
				resolve: { data: ArtistEditResolverService },
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: ArtistListPageComponent,
				data: {
					breadcrumb: 'list',
					permissions: {
						only: [
							RoleNames.ADMIN,
							ArtistAdminPermissionsService.viewArtistListPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'list',
				pathMatch: 'full',
				resolve: { data: ArtistListPageResolverService },
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class ArtistAdminRoutingModule {}
