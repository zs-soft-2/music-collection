import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumDetailViewComponent } from './album-detail-view.component';

@NgModule({
	exports: [AlbumDetailViewComponent],
	declarations: [AlbumDetailViewComponent],
	imports: [CommonModule, ImageModule],
})
export class AlbumDetailViewModule {}
