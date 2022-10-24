import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { AdminComponent } from './admin.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AdminComponent,
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
      import('@music-collection/domain/artist').then(
        (lib) => lib.ArtistAdminModule
      ),
    canActivate: [NgxPermissionsGuard],
    canLoad: [NgxPermissionsGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
