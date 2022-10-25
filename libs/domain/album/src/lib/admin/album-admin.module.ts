import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumFormModule } from '../form/album-form.module';
import { AlbumCollectionModule } from '../collection/album-collection.module';
import { AlbumAdminRoutingModule } from './album-admin-routing.module';
import { AlbumAdminComponent } from './page/admin';
import { AlbumEditComponent, AlbumEditResolverService } from './page/edit';
import {
	AlbumListPageComponent,
	AlbumListPageResolverService,
} from './page/list';

@NgModule({
	declarations: [
		AlbumAdminComponent,
		AlbumEditComponent,
		AlbumListPageComponent,
	],
	imports: [
		CommonModule,
		AlbumAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		AlbumFormModule,
		AlbumCollectionModule,
		ButtonModule,
		ToolbarModule,
	],
	providers: [AlbumEditResolverService, AlbumListPageResolverService],
})
export class AlbumAdminModule {}
