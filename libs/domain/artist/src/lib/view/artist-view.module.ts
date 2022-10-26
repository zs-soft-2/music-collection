import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
	ArtistDetailViewComponent,
	ArtistSimpleViewComponent,
} from './component';

@NgModule({
	declarations: [ArtistDetailViewComponent, ArtistSimpleViewComponent],
	imports: [CommonModule],
})
export class ArtistViewModule {}
