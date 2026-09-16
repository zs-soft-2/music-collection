import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumDetailViewModule } from '@music-collection/domain/album';

import { AlbumPageRoutingModule } from './album-page-routing.module';
import { AlbumPageComponent } from './album-page.component';

@NgModule({
	imports: [
		CommonModule,
		AlbumDetailViewModule,
		AlbumPageRoutingModule,
		AlbumPageComponent,
	],
	providers: [],
})
export class AlbumPageModule {}
