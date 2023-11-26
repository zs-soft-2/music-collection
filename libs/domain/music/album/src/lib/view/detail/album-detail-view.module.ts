import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RxLet } from '@rx-angular/template/let';

import { AlbumDetailViewComponent } from './album-detail-view.component';

@NgModule({
	exports: [AlbumDetailViewComponent],
	declarations: [AlbumDetailViewComponent],
	imports: [CommonModule, FlexLayoutModule, ImageModule, RxLet],
})
export class AlbumDetailViewModule {}
