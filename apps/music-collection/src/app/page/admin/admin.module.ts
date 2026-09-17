import { MenuModule } from 'primeng/menu';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';
import { DomainCollectionItemModule } from '@music-collection/domain/collection-item';
import { DomainLabelModule } from '@music-collection/domain/label';
import { DomainMusicianModule } from '@music-collection/domain/musician';
import { DomainReleaseModule } from '@music-collection/domain/release';
import { DomainWishlistItemModule } from '@music-collection/domain/wishlist-item';
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
