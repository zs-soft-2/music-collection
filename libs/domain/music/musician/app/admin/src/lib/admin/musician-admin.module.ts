import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	MusicianCollectionModule,
	MusicianFormModule,
} from '@music-collection/domain/musician';

import { MusicianAdminRoutingModule } from './musician-admin-routing.module';
import { MusicianAdminComponent } from './page/admin';
import {
	MusicianEditComponent,
	MusicianEditResolverService,
} from './page/edit';
import {
	MusicianListPageComponent,
	MusicianListPageResolverService,
} from './page/list';

@NgModule({
	imports: [
		CommonModule,
		MusicianAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		MusicianFormModule,
		MusicianCollectionModule,
		ButtonModule,
		ToolbarModule,
		MusicianAdminComponent,
		MusicianEditComponent,
		MusicianListPageComponent,
	],
	providers: [MusicianEditResolverService, MusicianListPageResolverService],
})
export class MusicianAdminModule {}
