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
		path: 'album/:albumId/track/:trackId',
		loadComponent: () =>
			import('./page/track/track-page.component').then(
				(module) => module.TrackPageComponent
			),
		data: {
			breadcrumb: 'track',
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
		path: 'musician/:musicianId',
		loadComponent: () =>
			import('./page/musician/musician-page.component').then(
				(module) => module.MusicianPageComponent
			),
		data: {
			breadcrumb: 'musician',
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
		path: 'collections',
		loadComponent: () =>
			import('./page/collections/collections-page.component').then(
				(module) => module.CollectionsPageComponent
			),
		data: {
			breadcrumb: 'collections',
		},
	},
	{
		path: 'collections/:slug',
		loadComponent: () =>
			import('./page/collections/collection-detail-page.component').then(
				(module) => module.CollectionDetailPageComponent
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
