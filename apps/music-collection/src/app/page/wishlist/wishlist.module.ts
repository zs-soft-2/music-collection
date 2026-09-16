import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ScrollTopModule } from 'primeng/scrolltop';
import { DrawerModule } from 'primeng/drawer';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';
import { FormsModule } from '@angular/forms';
import { WishlistItemCollectionModule } from '@music-collection/domain/wishlist-item';

import { WishlistRoutingModule } from './wishlist-routing.module';
import { WishlistContentComponent, WishlistPageComponent } from './component';

@NgModule({
	declarations: [WishlistPageComponent, WishlistContentComponent],
	imports: [
		CommonModule,
		AccordionModule,
		ButtonModule,
		WishlistRoutingModule,
		WishlistItemCollectionModule,
		FlexLayoutModule,
		FormsModule,
		MultiSelectModule,
		RadioButtonModule,
		ScrollTopModule,
		DrawerModule,
	],
})
export class WishlistModule {}
