import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { MusicianAdminComponent } from './page/admin';
import {
	MusicianEditComponent,
	MusicianEditResolverService,
} from './page/edit';
import {
	MusicianListPageComponent,
	MusicianListPageResolverService,
} from './page/list';
import { MusicianAdminPermissionsService } from './service';

const routes: Routes = [
	{
		path: '',
		component: MusicianAdminComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'list',
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: MusicianEditComponent,
				data: {
					breadcrumb: 'edit',
					permissions: {
						only: [
							RoleNames.ADMIN,
							MusicianAdminPermissionsService.viewMusicianEditPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'edit/:musicianId',
				pathMatch: 'full',
				resolve: { data: MusicianEditResolverService },
			},
			{
				canActivate: [NgxPermissionsGuard],
				component: MusicianListPageComponent,
				data: {
					breadcrumb: 'list',
					permissions: {
						only: [
							RoleNames.ADMIN,
							MusicianAdminPermissionsService.viewMusicianListPage,
						],
						redirectTo: '/error',
					},
				},
				path: 'list',
				pathMatch: 'full',
				resolve: { data: MusicianListPageResolverService },
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class MusicianAdminRoutingModule {}
