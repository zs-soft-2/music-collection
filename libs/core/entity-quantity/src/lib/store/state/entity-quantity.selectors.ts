import {
	ENTITY_QUANTITY_FEATURE_KEY,
	EntityQuantityEntity,
} from '@music-collection/api';
import { Dictionary } from '@ngrx/entity';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import {
	entityQuantityAdapter,
	EntityQuantityPartialState,
	State,
} from './entity-quantity.reducer';

const { selectAll, selectEntities } = entityQuantityAdapter.getSelectors();

export const getEntityQuantityState = createFeatureSelector<
	EntityQuantityPartialState,
	State
>(ENTITY_QUANTITY_FEATURE_KEY);

export const getEntityQuantityError = createSelector(
	getEntityQuantityState,
	(state: State) => state.error
);

export const getEntityQuantityLoading = createSelector(
	getEntityQuantityState,
	(state: State) => state.loading
);

export const getSelectedId = createSelector(
	getEntityQuantityState,
	(state: State) => state.selectedId || ''
);

export const selectEntityQuantityEntities = createSelector(
	getEntityQuantityState,
	selectEntities
);

export const selectAllEntityQuantity = createSelector(
	getEntityQuantityState,
	selectAll
);

export const selectEntityQuantity = createSelector(
	selectEntityQuantityEntities,
	getSelectedId,
	(entityQuantityEntities, entityQuantityID) =>
		entityQuantityEntities[entityQuantityID]
);

export const selectEntityQuantityById = () =>
	createSelector(
		selectEntityQuantityEntities,
		(
			entityQuantityEntities: Dictionary<EntityQuantityEntity>,
			props: any
		) => entityQuantityEntities[props.uid]
	);
