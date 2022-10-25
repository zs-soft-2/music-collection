import { NgxPermissionsGuard } from 'ngx-permissions';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { LabelAdminComponent } from './page/admin';
import { LabelEditComponent, LabelEditResolverService } from './page/edit';
import {
  LabelListPageComponent,
  LabelListPageResolverService,
} from './page/list';
import { LabelAdminPermissionsService } from './service';

const routes: Routes = [
  {
    path: '',
    component: LabelAdminComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'list',
      },
      {
        canActivate: [NgxPermissionsGuard],
        component: LabelEditComponent,
        data: {
          breadcrumb: 'edit',
          permissions: {
            only: [
              RoleNames.ADMIN,
              LabelAdminPermissionsService.viewLabelEditPage,
            ],
            redirectTo: '/error',
          },
        },
        path: 'edit/:labelId',
        pathMatch: 'full',
        resolve: { data: LabelEditResolverService },
      },
      {
        canActivate: [NgxPermissionsGuard],
        component: LabelListPageComponent,
        data: {
          breadcrumb: 'list',
          permissions: {
            only: [
              RoleNames.ADMIN,
              LabelAdminPermissionsService.viewLabelListPage,
            ],
            redirectTo: '/error',
          },
        },
        path: 'list',
        pathMatch: 'full',
        resolve: { data: LabelListPageResolverService },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LabelAdminRoutingModule {}
