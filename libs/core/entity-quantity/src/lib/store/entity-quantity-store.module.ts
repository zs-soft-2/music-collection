import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  ENTITY_QUANTITY_FEATURE_KEY,
  EntityQuantityStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { EntityQuantityStateServiceImpl } from './state/entity-quantity-state.service.impl';
import { EntityQuantityEffects } from './state/entity-quantity.effects';
import * as fromEntityQuantity from './state/entity-quantity.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(
      ENTITY_QUANTITY_FEATURE_KEY,
      fromEntityQuantity.reducer
    ),
    EffectsModule.forFeature([EntityQuantityEffects]),
  ],
  providers: [
    {
      provide: EntityQuantityStateService,
      useClass: EntityQuantityStateServiceImpl,
    },
  ],
})
export class EntityQuantityStoreModule {}
