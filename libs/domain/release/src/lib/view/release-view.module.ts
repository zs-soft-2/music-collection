import { AngularSvgIconModule } from 'angular-svg-icon';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumViewModule } from '@music-collection/domain/album';

import {
	ReleaseDetailViewComponent,
	ReleaseSimpleViewComponent,
} from './component';

@NgModule({
	exports: [ReleaseDetailViewComponent, ReleaseSimpleViewComponent],
	declarations: [ReleaseDetailViewComponent, ReleaseSimpleViewComponent],
	imports: [CommonModule, AlbumViewModule, AngularSvgIconModule],
})
export class ReleaseViewModule {}
