import { NgxPermissionsModule } from 'ngx-permissions';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ToolbarModule } from 'primeng/toolbar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WishlistItemCollectionModule } from '../collection/wishlist-item-collection.module';
import { WishlistItemFormModule } from '../form/wishlist-item-form.module';
import { WishlistItemAdminRoutingModule } from './wishlist-item-admin-routing.module';
import { WishlistItemAdminComponent } from './page/admin';
import {
	WishlistItemEditComponent,
	WishlistItemEditResolverService,
} from './page/edit';
import {
	WishlistItemListPageComponent,
	WishlistItemListPageResolverService,
} from './page/list';

@NgModule({
	declarations: [
		WishlistItemAdminComponent,
		WishlistItemEditComponent,
		WishlistItemListPageComponent,
	],
	imports: [
		CommonModule,
		WishlistItemAdminRoutingModule,
		NgxPermissionsModule.forChild(),
		WishlistItemFormModule,
		WishlistItemCollectionModule,
		ButtonModule,
		FileUploadModule,
		ToolbarModule,
	],
	providers: [
		WishlistItemEditResolverService,
		WishlistItemListPageResolverService,
	],
})
export class WishlistItemAdminModule {}
