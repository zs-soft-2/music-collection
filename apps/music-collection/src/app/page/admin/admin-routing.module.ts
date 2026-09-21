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
				path: '',
				pathMatch: 'full',
				redirectTo: 'dashboard',
			},
			{
				path: 'dashboard',
				data: {
					breadcrumb: 'dashboard',
				},
				loadComponent: () =>
					import('./dashboard/admin-dashboard.component').then(
						(module) => module.AdminDashboardComponent
					),
			},
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
					import('@music-collection/domain/label/admin').then(
						(lib) => lib.LabelAdminModule
					),
				canActivate: [NgxPermissionsGuard],
				canLoad: [NgxPermissionsGuard],
			},
			{
				path: 'musician',
				data: {
					breadcrumb: 'musician',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadChildren: () =>
					import('@music-collection/domain/musician/admin').then(
						(lib) => lib.MusicianAdminModule
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
				path: 'release-request',
				data: {
					breadcrumb: 'release-request',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./release-request/release-request-admin.component').then(
						(module) => module.ReleaseRequestAdminComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'music-collection',
				data: {
					breadcrumb: 'music-collection',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./music-collection/music-collection-admin.component').then(
						(module) => module.MusicCollectionAdminComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'music-collection/edit/:uid',
				data: {
					breadcrumb: 'music-collection',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./music-collection/edit/music-collection-edit.component').then(
						(module) => module.MusicCollectionEditComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'badge-settings',
				data: {
					breadcrumb: 'badge-settings',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./badge-settings/badge-settings.component').then(
						(module) => module.BadgeSettingsComponent
					),
				canActivate: [NgxPermissionsGuard],
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
