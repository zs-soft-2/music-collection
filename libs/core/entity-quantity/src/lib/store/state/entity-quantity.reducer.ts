import {
  EntityQuantityEntity,
  ENTITY_QUANTITY_FEATURE_KEY,
} from '@music-collection/api';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Action, createReducer, on } from '@ngrx/store';

import * as entityQuantityActions from './entity-quantity.actions';

export interface State extends EntityState<EntityQuantityEntity> {
  selectedId?: string;
  loading: boolean;
  error?: string | null;
}

export interface EntityQuantityPartialState {
  readonly [ENTITY_QUANTITY_FEATURE_KEY]: State;
}

export const entityQuantityAdapter: EntityAdapter<EntityQuantityEntity> =
  createEntityAdapter<EntityQuantityEntity>({
    selectId: (model: EntityQuantityEntity) => model.uid || '',
  });

export const initialState: State = entityQuantityAdapter.getInitialState({
  loading: false,
  error: null,
  selectedEntityQuantityId: null,
});

export const entityQuantityReducer = createReducer(
  initialState,
  on(
    entityQuantityActions.addEntityQuantitySuccess,
    (state, { entityQuantity }) =>
      entityQuantityAdapter.addOne(
        entityQuantity as EntityQuantityEntity,
        state
      )
  ),
  on(
    entityQuantityActions.selectEntityQuantity,
    (state, { entityQuantityId }) => ({
      ...state,
      loading: false,
      error: null,
      selectedEntityQuantityId: entityQuantityId,
    })
  ),
  on(
    entityQuantityActions.updateEntityQuantitySuccess,
    (state, { entityQuantity }) =>
      entityQuantityAdapter.updateOne(entityQuantity, state)
  ),
  on(
    entityQuantityActions.deleteEntityQuantitySuccess,
    (state, { entityQuantityId }) =>
      entityQuantityAdapter.removeOne(entityQuantityId, state)
  ),
  on(
    entityQuantityActions.listEntityQuantitiesSuccess,
    (state, { entityQuantities }) =>
      entityQuantityAdapter.upsertMany(
        entityQuantities as EntityQuantityEntity[],
        state
      )
  ),
  on(
    entityQuantityActions.loadEntityQuantitySuccess,
    (state, { entityQuantity }) =>
      entityQuantityAdapter.upsertOne(
        entityQuantity as EntityQuantityEntity,
        state
      )
  ),
  on(entityQuantityActions.clearEntityQuantities, (state) =>
    entityQuantityAdapter.removeAll(state)
  ),
  on(
    entityQuantityActions.setSelectedEntityQuantityId,
    (state, { entityQuantityId }) => ({
      ...state,
      selectedId: entityQuantityId,
    })
  )
);

export function reducer(state: State | undefined, action: Action) {
  return entityQuantityReducer(state, action);
}

export const { selectIds, selectEntities, selectAll, selectTotal } =
  entityQuantityAdapter.getSelectors();
