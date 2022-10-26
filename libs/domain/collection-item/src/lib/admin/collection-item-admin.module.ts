import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CollectionItemFormModule } from '../form/collection-item-form.module';
import { CollectionItemCollectionModule } from '../collection/collection-item-collection.module';
import { CollectionItemAdminRoutingModule } from './collection-item-admin-routing.module';
import { CollectionItemAdminComponent } from './page/admin';
import {
	CollectionItemEditComponent,
	CollectionItemEditResolverService,
} from './page/edit';
import {
	CollectionItemListPageComponent,
	CollectionItemListPageResolverService,
} from './page/list';

@NgModule({
	declarations: [
		CollectionItemAdminComponent,
		CollectionItemEditComponent,
		CollectionItemListPageComponent,
	],
	imports: [
		CommonModule,
		CollectionItemAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		CollectionItemFormModule,
		CollectionItemCollectionModule,
		ButtonModule,
		ToolbarModule,
	],
	providers: [
		CollectionItemEditResolverService,
		CollectionItemListPageResolverService,
	],
})
export class CollectionItemAdminModule {}
