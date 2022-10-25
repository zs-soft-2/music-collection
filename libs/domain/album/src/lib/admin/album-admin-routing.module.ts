import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { AlbumAdminComponent } from './page/admin';
import { AlbumEditComponent, AlbumEditResolverService } from './page/edit';
import {
  AlbumListPageComponent,
  AlbumListPageResolverService,
} from './page/list';
import { AlbumAdminPermissionsService } from './service';

const routes: Routes = [
  {
    path: '',
    component: AlbumAdminComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'list',
      },
      {
        canActivate: [NgxPermissionsGuard],
        component: AlbumEditComponent,
        data: {
          breadcrumb: 'edit',
          permissions: {
            only: [
              RoleNames.ADMIN,
              AlbumAdminPermissionsService.viewAlbumEditPage,
            ],
            redirectTo: '/error',
          },
        },
        path: 'edit/:albumId',
        pathMatch: 'full',
        resolve: { data: AlbumEditResolverService },
      },
      {
        canActivate: [NgxPermissionsGuard],
        component: AlbumListPageComponent,
        data: {
          breadcrumb: 'list',
          permissions: {
            only: [
              RoleNames.ADMIN,
              AlbumAdminPermissionsService.viewAlbumListPage,
            ],
            redirectTo: '/error',
          },
        },
        path: 'list',
        pathMatch: 'full',
        resolve: { data: AlbumListPageResolverService },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AlbumAdminRoutingModule {}
