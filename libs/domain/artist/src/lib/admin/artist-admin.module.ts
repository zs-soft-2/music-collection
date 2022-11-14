import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArtistCollectionModule } from '../collection/artist-collection.module';
import { ArtistFormModule } from '../form/artist-form.module';
import { ArtistAdminRoutingModule } from './artist-admin-routing.module';
import { ArtistAdminComponent } from './page/admin';
import { ArtistEditComponent, ArtistEditResolverService } from './page/edit';
import {
	ArtistListPageComponent,
	ArtistListPageResolverService,
} from './page/list';
import { ArtistImportComponent } from './page/import';

@NgModule({
	declarations: [
		ArtistAdminComponent,
		ArtistEditComponent,
		ArtistImportComponent,
		ArtistListPageComponent,
	],
	imports: [
		CommonModule,
		ArtistAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		ArtistFormModule,
		ArtistCollectionModule,
		ButtonModule,
		FileUploadModule,
		ToolbarModule,
	],
	providers: [ArtistEditResolverService, ArtistListPageResolverService],
})
export class ArtistAdminModule {}
