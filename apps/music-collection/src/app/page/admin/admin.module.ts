import { MenuModule } from 'primeng/menu';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';
import { DomainCollectionItemModule } from '@music-collection/domain/collection-item/core';
import { DomainLabelModule } from '@music-collection/domain/label/core';
import { DomainMusicianModule } from '@music-collection/domain/musician/core';
import { DomainReleaseModule } from '@music-collection/domain/release/core';
import { DomainWishlistItemModule } from '@music-collection/domain/wishlist-item/core';
import { BreadcrumbModule } from '@music-collection/ui';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';

@NgModule({
	imports: [
		CommonModule,
		AdminRoutingModule,
		BreadcrumbModule,
		FlexLayoutModule,
		MenuModule,
		DomainLabelModule,
		DomainMusicianModule,
		DomainReleaseModule,
		DomainCollectionItemModule,
		DomainWishlistItemModule,
		AdminComponent,
	],
	exports: [],
})
export class AdminModule {}
