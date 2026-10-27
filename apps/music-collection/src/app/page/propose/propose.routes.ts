import { Type } from '@angular/core';
import { Routes } from '@angular/router';

/**
 * Proposing a change to the catalog: the entity's own form, and then what
 * backs the change.
 *
 * The shape follows the admin's (`list`, `edit/:xId`), because the forms
 * navigate by it — `../../list` on save and on cancel. Here `list` is where
 * the proposal is reviewed and sent, which is exactly where a collector
 * should land the moment the form lets go of them. The route parameter is
 * named after the entity for the same reason: that is what each form reads.
 */
const review = () =>
	import('./propose-review/propose-review.component').then(
		(module) => module.ProposeReviewComponent
	);

const under = (
	parameter: string,
	edit: () => Promise<Type<unknown>>
): Routes => [
	{ path: '', pathMatch: 'full', redirectTo: 'list' },
	{ path: 'list', loadComponent: review, data: { breadcrumb: 'list' } },
	{
		path: `edit/:${parameter}`,
		loadComponent: edit,
		data: { breadcrumb: 'edit' },
	},
];

const pages = () => import('./propose-edit.components');

export const proposeRoutes: Routes = [
	{
		path: 'artist',
		children: under('artistId', () =>
			pages().then((module) => module.ProposeArtistComponent)
		),
	},
	{
		path: 'album',
		children: under('albumId', () =>
			pages().then((module) => module.ProposeAlbumComponent)
		),
	},
	{
		path: 'release',
		children: under('releaseId', () =>
			pages().then((module) => module.ProposeReleaseComponent)
		),
	},
	{
		path: 'label',
		children: under('labelId', () =>
			pages().then((module) => module.ProposeLabelComponent)
		),
	},
	{
		path: 'musician',
		children: under('musicianId', () =>
			pages().then((module) => module.ProposeMusicianComponent)
		),
	},
	{ path: '', pathMatch: 'full', redirectTo: 'artist' },
];
