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
					import('@music-collection/domain/artist/admin').then(
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
					import('@music-collection/domain/album/admin').then(
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
			{
				path: 'release',
				data: {
					breadcrumb: 'release',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/release/admin').then(
						(lib) => lib.ReleaseAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
			{
				path: 'collection-item',
				data: {
					breadcrumb: 'collection-item',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/collection-item/admin').then(
						(lib) => lib.CollectionItemAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
			{
				path: 'wishlist-item',
				data: {
					breadcrumb: 'wishlist-item',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/wishlist-item/admin').then(
						(lib) => lib.WishlistItemAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
			{
				path: 'document',
				data: {
					breadcrumb: 'document',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/document/admin').then(
						(lib) => lib.DocumentAdminModule
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
