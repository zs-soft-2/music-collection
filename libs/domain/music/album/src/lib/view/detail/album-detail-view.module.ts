import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from 'ng-flex-layout';

import { AlbumDetailViewComponent } from './album-detail-view.component';

@NgModule({
	exports: [AlbumDetailViewComponent],
	imports: [
		CommonModule,
		FlexLayoutModule,
		ImageModule,
		AlbumDetailViewComponent,
	],
})
export class AlbumDetailViewModule {}
