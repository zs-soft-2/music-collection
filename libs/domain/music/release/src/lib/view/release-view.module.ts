import { AngularSvgIconModule } from 'angular-svg-icon';
import { FlexLayoutModule } from 'ng-flex-layout';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumSimpleViewModule } from '@music-collection/domain/album';

import {
	ReleaseDetailViewComponent,
	ReleaseSimpleViewComponent,
} from './component';

@NgModule({
	exports: [ReleaseDetailViewComponent, ReleaseSimpleViewComponent],
	imports: [
		CommonModule,
		AlbumSimpleViewModule,
		AngularSvgIconModule,
		FlexLayoutModule,
		ReleaseDetailViewComponent,
		ReleaseSimpleViewComponent,
	],
})
export class ReleaseViewModule {}
