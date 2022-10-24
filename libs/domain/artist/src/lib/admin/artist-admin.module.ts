import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArtistFormModule } from '../form/artist-form.module';
import { ArtistCollectionModule } from '../collection/artist-collection.module';
import { ArtistAdminRoutingModule } from './artist-admin-routing.module';
import { ArtistAdminComponent } from './page/admin';
import { ArtistEditComponent, ArtistEditResolverService } from './page/edit';
import {
  ArtistListPageComponent,
  ArtistListResolverService,
} from './page/list';

@NgModule({
  declarations: [
    ArtistAdminComponent,
    ArtistEditComponent,
    ArtistListPageComponent,
  ],
  imports: [
    CommonModule,
    ArtistAdminRoutingModule,
    NgxPermissionsModule.forChild(),
    ArtistFormModule,
    ArtistCollectionModule,
    ButtonModule,
    ToolbarModule,
  ],
  providers: [ArtistEditResolverService, ArtistListResolverService],
})
export class ArtistAdminModule {}
