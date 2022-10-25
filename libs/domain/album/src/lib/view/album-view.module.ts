import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
  AlbumDetailViewComponent,
  AlbumSimpleViewComponent,
} from './component';

@NgModule({
  declarations: [AlbumDetailViewComponent, AlbumSimpleViewComponent],
  imports: [CommonModule],
})
export class AlbumViewModule {}
