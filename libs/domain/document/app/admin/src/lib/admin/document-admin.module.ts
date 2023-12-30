import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
	DocumentCollectionModule,
	DocumentFormModule,
} from '@music-collection/domain/document';

import { DocumentAdminRoutingModule } from './document-admin-routing.module';
import { DocumentAdminComponent } from './page/admin';
import {
	DocumentEditComponent,
	DocumentEditResolverService,
} from './page/edit';
import {
	DocumentListPageComponent,
	DocumentListPageResolverService,
} from './page/list';

@NgModule({
	declarations: [
		DocumentAdminComponent,
		DocumentEditComponent,
		DocumentListPageComponent,
	],
	imports: [
		CommonModule,
		DocumentAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		DocumentFormModule,
		DocumentCollectionModule,
		ButtonModule,
		ToolbarModule,
	],
	providers: [DocumentEditResolverService, DocumentListPageResolverService],
})
export class DocumentAdminModule {}
