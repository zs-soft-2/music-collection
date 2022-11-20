import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';
import { ArtistPageResolverService } from './resolver';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'home',
		pathMatch: 'full',
	},
	{
		path: 'home',
		loadChildren: () =>
			import('./page/home/home.module').then(
				(module) => module.HomeModule
			),
		data: {
			breadcrumb: 'home',
		},
	},
	{
		path: 'artist/:artistId',
		loadChildren: () =>
			import('./page/artist/artist-page.module').then(
				(module) => module.ArtistPageModule
			),
		data: {
			breadcrumb: 'artist',
		},
		resolve: {
			artist$: ArtistPageResolverService,
		},
	},
	{
		path: 'collection',
		loadChildren: () =>
			import('./page/collection/collection.module').then(
				(module) => module.CollectionModule
			),
		data: {
			breadcrumb: 'collection',
			permissions: {
				redirectTo: '/home',
			},
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
		loadChildren: () =>
			import('./page/error/error.module').then(
				(module) => module.ErrorModule
			),
	},
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes, {
			useHash: true,
		}),
	],
	exports: [RouterModule],
})
export class AppRoutingModule {}
