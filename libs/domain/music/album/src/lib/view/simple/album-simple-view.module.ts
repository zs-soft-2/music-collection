import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumSimpleViewComponent } from './album-simple-view.component';

@NgModule({
	exports: [AlbumSimpleViewComponent],
	declarations: [AlbumSimpleViewComponent],
	imports: [CommonModule, ImageModule],
})
export class AlbumSimpleViewModule {}
