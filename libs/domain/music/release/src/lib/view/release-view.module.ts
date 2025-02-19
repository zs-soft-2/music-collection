import { AngularSvgIconModule } from 'angular-svg-icon';
import { FlexLayoutModule } from 'ng-flex-layout';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AlbumSimpleViewModule } from '@music-collection/domain/album';
import { RxLet } from '@rx-angular/template/let';

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
		RxLet,
	],
})
export class ReleaseViewModule {}
