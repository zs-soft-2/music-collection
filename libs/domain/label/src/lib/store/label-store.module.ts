import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LABEL_FEATURE_KEY, LabelStateService } from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { LabelStateServiceImpl } from './state/label-state.service.impl';
import { LabelEffects } from './state/label.effects';
import * as fromLabel from './state/label.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(LABEL_FEATURE_KEY, fromLabel.reducer),
    EffectsModule.forFeature([LabelEffects]),
  ],
  providers: [
    {
      provide: LabelStateService,
      useClass: LabelStateServiceImpl,
    },
  ],
})
export class LabelStoreModule {}
