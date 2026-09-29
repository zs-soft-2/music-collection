import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
	RoleNames,
	RolePermissionsService,
	UserPermissionsService,
} from '@music-collection/api';

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
				path: 'request',
				data: {
					breadcrumb: 'request',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./request/request-admin.component').then(
						(module) => module.RequestAdminComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				// A kiadás-kérések a kérések listájában élnek: aki a régi
				// linket nyitja meg, oda érkezik.
				path: 'release-request',
				pathMatch: 'full',
				redirectTo: 'request',
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
				path: 'genre',
				data: {
					breadcrumb: 'genre',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./genre/genre-admin.component').then(
						(module) => module.GenreAdminComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				// A szerepkörök szerkesztése a jogosultság írása maga: aki
				// ide bejut, az osztja a permissionöket. Ezért a wildcard
				// mellett csak az áll meg, akinek külön joga van rá.
				path: 'role',
				data: {
					breadcrumb: 'role',
					permissions: {
						only: [
							RoleNames.ADMIN,
							RolePermissionsService.updateRoleEntity,
						],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./role/role-admin.component').then(
						(module) => module.RoleAdminComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				// The editor is a page of its own so that a role has an
				// address: one admin can send another the role in question.
				path: 'role/new',
				data: {
					breadcrumb: 'role',
					permissions: {
						only: [
							RoleNames.ADMIN,
							RolePermissionsService.createRoleEntity,
						],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./role/edit/role-edit.component').then(
						(module) => module.RoleEditComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'role/edit/:roleId',
				data: {
					breadcrumb: 'role',
					permissions: {
						only: [
							RoleNames.ADMIN,
							RolePermissionsService.updateRoleEntity,
						],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./role/edit/role-edit.component').then(
						(module) => module.RoleEditComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'user',
				data: {
					breadcrumb: 'user',
					permissions: {
						only: [
							RoleNames.ADMIN,
							UserPermissionsService.updateUserEntity,
						],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./user/user-admin.component').then(
						(module) => module.UserAdminComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'language-settings',
				data: {
					breadcrumb: 'language-settings',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./language-settings/language-settings.component').then(
						(module) => module.LanguageSettingsComponent
					),
				canActivate: [NgxPermissionsGuard],
			},
			{
				path: 'daily-question',
				data: {
					breadcrumb: 'daily-question',
					permissions: {
						only: [RoleNames.ADMIN],
						redirectTo: '/error',
					},
				},
				loadComponent: () =>
					import('./daily-question/daily-question-settings.component').then(
						(module) => module.DailyQuestionSettingsComponent
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
