import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ScrollTopModule } from 'primeng/scrolltop';
import { SidebarModule } from 'primeng/sidebar';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import { CollectionItemCollectionModule } from '@music-collection/domain/collection-item';

import { CollectionRoutingModule } from './collection-routing.module';
import {
	CollectionContentComponent,
	CollectionPageComponent,
} from './component';
import { CollectionSidebarComponent } from './component/sidebar';

@NgModule({
	declarations: [
		CollectionPageComponent,
		CollectionContentComponent,
		CollectionSidebarComponent,
	],
	imports: [
		CommonModule,
		AccordionModule,
		ButtonModule,
		CollectionRoutingModule,
		CollectionItemCollectionModule,
		FlexLayoutModule,
		FormsModule,
		MultiSelectModule,
		RadioButtonModule,
		ScrollTopModule,
		SidebarModule,
	],
})
export class CollectionModule {}
