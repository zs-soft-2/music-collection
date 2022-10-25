import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AlbumDataModule } from './data/album-data.module';
import { AlbumStoreModule } from './store/album-store.module';
import { AlbumUtilModule } from './util/album-util.module';

@NgModule({
  imports: [CommonModule, AlbumDataModule, AlbumUtilModule, AlbumStoreModule],
})
export class DomainAlbumModule {}
