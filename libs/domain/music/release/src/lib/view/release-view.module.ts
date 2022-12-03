import { AngularSvgIconModule } from 'angular-svg-icon';
import { FlexLayoutModule } from '@angular/flex-layout';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumSimpleViewModule } from '@music-collection/domain/album';
import { LetModule } from '@rx-angular/template';

import {
	ReleaseDetailViewComponent,
	ReleaseSimpleViewComponent,
} from './component';

@NgModule({
	exports: [ReleaseDetailViewComponent, ReleaseSimpleViewComponent],
	declarations: [ReleaseDetailViewComponent, ReleaseSimpleViewComponent],
	imports: [
		CommonModule,
		AlbumSimpleViewModule,
		AngularSvgIconModule,
		FlexLayoutModule,
		LetModule,
	],
})
export class ReleaseViewModule {}
