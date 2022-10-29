import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ImageModule } from 'primeng/image';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	ArtistDetailViewComponent,
	ArtistSimpleViewComponent,
} from './component';

@NgModule({
	exports: [ArtistDetailViewComponent, ArtistSimpleViewComponent],
	declarations: [ArtistDetailViewComponent, ArtistSimpleViewComponent],
	imports: [CommonModule, CardModule, ChipModule, ImageModule],
})
export class ArtistViewModule {}
