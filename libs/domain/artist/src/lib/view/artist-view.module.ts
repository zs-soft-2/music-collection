import { ChipModule } from 'primeng/chip';
import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import {
	ArtistDetailViewComponent,
	ArtistSimpleViewComponent,
} from './component';

@NgModule({
	exports: [ArtistDetailViewComponent, ArtistSimpleViewComponent],
	declarations: [ArtistDetailViewComponent, ArtistSimpleViewComponent],
	imports: [CommonModule, ChipModule, FlexLayoutModule, ImageModule],
})
export class ArtistViewModule {}
