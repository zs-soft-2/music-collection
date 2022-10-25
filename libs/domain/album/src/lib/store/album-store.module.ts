import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ALBUM_FEATURE_KEY, AlbumStateService } from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { AlbumStateServiceImpl } from './state/album-state.service.impl';
import { AlbumEffects } from './state/album.effects';
import * as fromAlbum from './state/album.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(ALBUM_FEATURE_KEY, fromAlbum.reducer),
    EffectsModule.forFeature([AlbumEffects]),
  ],
  providers: [
    {
      provide: AlbumStateService,
      useClass: AlbumStateServiceImpl,
    },
  ],
})
export class AlbumStoreModule {}
