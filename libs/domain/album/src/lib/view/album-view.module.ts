import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	AlbumDetailViewComponent,
	AlbumSimpleViewComponent,
} from './component';

@NgModule({
	exports: [AlbumDetailViewComponent, AlbumSimpleViewComponent],
	declarations: [AlbumDetailViewComponent, AlbumSimpleViewComponent],
	imports: [CommonModule, ImageModule],
})
export class AlbumViewModule {}
