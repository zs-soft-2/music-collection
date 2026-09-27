import { Routes } from '@angular/router';

/**
 * The collector's own bands: a list, and the catalog's own artist form to
 * add to it. The shape follows the admin's (`list`, `edit/:artistId`, where
 * `0` is a new one), because the form navigates by it — `../../list` on save
 * and on cancel.
 */
export const ownedArtistRoutes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'list',
	},
	{
		path: 'list',
		loadComponent: () =>
			import('./list/owned-artist-list.component').then(
				(module) => module.OwnedArtistListComponent
			),
		data: { breadcrumb: 'list' },
	},
	{
		path: 'edit/:artistId',
		loadComponent: () =>
			import('./edit/owned-artist-edit.component').then(
				(module) => module.OwnedArtistEditComponent
			),
		data: { breadcrumb: 'edit' },
	},
];
