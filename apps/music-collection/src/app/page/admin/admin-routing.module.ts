import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { AdminComponent } from './admin.component';

const routes: Routes = [
	{
		path: '',
		component: AdminComponent,
		children: [
			{
				path: 'artist',
				data: {
					breadcrumb: 'artist',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/artist').then(
						(lib) => lib.ArtistAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
			{
				path: 'album',
				data: {
					breadcrumb: 'album',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/album').then(
						(lib) => lib.AlbumAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
			{
				path: 'label',
				data: {
					breadcrumb: 'label',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/label').then(
						(lib) => lib.LabelAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class AdminRoutingModule {}
