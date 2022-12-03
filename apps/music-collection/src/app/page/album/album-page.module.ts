import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumDetailViewModule } from '@music-collection/domain/album';

import { AlbumPageRoutingModule } from './album-page-routing.module';
import { AlbumPageComponent } from './album-page.component';

@NgModule({
	declarations: [AlbumPageComponent],
	imports: [CommonModule, AlbumDetailViewModule, AlbumPageRoutingModule],
	providers: [],
})
export class AlbumPageModule {}
