import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumListComponent, AlbumTableComponent } from './component';

@NgModule({
  declarations: [AlbumListComponent, AlbumTableComponent],
  exports: [AlbumListComponent, AlbumTableComponent],
  imports: [CommonModule, ButtonModule, ChipModule, TableModule],
})
export class AlbumCollectionModule {}
