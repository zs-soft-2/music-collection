import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumItemViewComponent } from './album-item-view.component';

@NgModule({
	exports: [AlbumItemViewComponent],
	declarations: [AlbumItemViewComponent],
	imports: [CommonModule, ButtonModule, ImageModule],
})
export class AlbumItemViewModule {}
