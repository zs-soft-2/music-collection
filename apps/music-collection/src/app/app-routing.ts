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
		// One copy on one shelf. Only the signed-in collector's own copies
		// open here: what the page adds to the catalog — the price, the
		// shelf place, the story, the photographs — is theirs.
		path: 'collection/copy/:itemId',
		loadComponent: () =>
			import(
				'./page/collection-item/collection-item-page.component'
			).then((module) => module.CollectionItemPageComponent),
		data: {
			breadcrumb: 'copy',
		},
	},
	{
		path: 'scan',
		loadComponent: () =>
			import('./page/scan/scan-page.component').then(
				(module) => module.ScanPageComponent
			),
		data: {
			breadcrumb: 'scan',
		},
	},
	{
		path: 'radio',
		loadComponent: () =>
			import('./page/radio/radio-page.component').then(
				(module) => module.RadioPageComponent
			),
		data: {
			breadcrumb: 'radio',
		},
	},
	{
		path: 'visual-lab',
		loadComponent: () =>
			import('./page/visual-lab/visual-lab.component').then(
				(module) => module.VisualLabComponent
			),
		data: {
			breadcrumb: 'visual-lab',
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
		path: 'map',
		loadComponent: () =>
			import('./page/map/map-page.component').then(
				(module) => module.MapPageComponent
			),
		data: {
			breadcrumb: 'map',
		},
	},
	{
		path: 'profile',
		loadComponent: () =>
			import('./page/profile/profile-page.component').then(
				(module) => module.ProfilePageComponent
			),
		data: {
			breadcrumb: 'profile',
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
