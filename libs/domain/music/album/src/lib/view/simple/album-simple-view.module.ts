import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumSimpleViewComponent } from './album-simple-view.component';

@NgModule({
	exports: [AlbumSimpleViewComponent],
	imports: [CommonModule, ImageModule, AlbumSimpleViewComponent],
})
export class AlbumSimpleViewModule {}
