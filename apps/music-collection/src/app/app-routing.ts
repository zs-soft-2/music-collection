import { NgxPermissionsGuard } from 'ngx-permissions';

import { Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'home',
		pathMatch: 'full',
	},
	{
		path: 'home',
		loadComponent: () =>
			import('./page/home/home-page.component').then(
				(module) => module.HomePageComponent
			),
		data: {
			breadcrumb: 'home',
		},
	},
	{
		path: 'album/:albumId',
		loadComponent: () =>
			import('./page/album/album-page.component').then(
				(module) => module.AlbumPageComponent
			),
		data: {
			breadcrumb: 'album',
		},
	},
	{
		path: 'artist/:artistId',
		loadComponent: () =>
			import('./page/artist/artist-page.component').then(
				(module) => module.ArtistPageComponent
			),
		data: {
			breadcrumb: 'artist',
		},
	},
	{
		path: 'network',
		loadComponent: () =>
			import('./page/network/network-page.component').then(
				(module) => module.NetworkPageComponent
			),
		data: {
			breadcrumb: 'network',
		},
	},
	{
		path: 'spotify/callback',
		loadComponent: () =>
			import('./shared/spotify/spotify-callback.component').then(
				(module) => module.SpotifyCallbackComponent
			),
	},
	{
		path: 'collection',
		loadComponent: () =>
			import('./page/collection/collection-page.component').then(
				(module) => module.CollectionPageComponent
			),
		data: {
			breadcrumb: 'collection',
		},
	},
	{
		path: 'wishlist',
		loadChildren: () =>
			import('./page/wishlist/wishlist.module').then(
				(module) => module.WishlistModule
			),
		data: {
			breadcrumb: 'wishlist',
		},
	},
	{
		path: 'admin',
		loadChildren: () =>
			import('./page/admin/admin.module').then(
				(module) => module.AdminModule
			),
		data: {
			breadcrumb: 'admin',
			permissions: {
				only: [RoleNames.ADMIN],
				redirectTo: '/error',
			},
		},
		canActivate: [NgxPermissionsGuard],
		canLoad: [NgxPermissionsGuard],
	},
	{
		path: 'error',
		loadComponent: () =>
			import('./page/error/error.component').then(
				(module) => module.ErrorComponent
			),
	},
];
