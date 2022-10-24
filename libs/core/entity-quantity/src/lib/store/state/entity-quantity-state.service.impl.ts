import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
  EntityQuantityEntity,
  EntityQuantityEntityAdd,
  EntityQuantityEntityUpdate,
  EntityQuantityStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as entityQuantityActions from './entity-quantity.actions';
import * as fromEntityQuantity from './entity-quantity.reducer';
import * as entityQuantitySelectors from './entity-quantity.selectors';

@Injectable()
export class EntityQuantityStateServiceImpl extends EntityQuantityStateService {
  public constructor(
    private store: Store<fromEntityQuantity.EntityQuantityPartialState>
  ) {
    super();
  }

  public dispatchAddEntityAction(
    entityQuantity: EntityQuantityEntityAdd
  ): void {
    this.store.dispatch(
      entityQuantityActions.addEntityQuantity({ entityQuantity })
    );
  }

  public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
    this.store.dispatch(
      entityQuantityActions.changeNewEntityButtonEnabled({ enabled })
    );
  }

  public dispatchDeleteEntityAction(
    entityQuantity: EntityQuantityEntity
  ): void {
    this.store.dispatch(
      entityQuantityActions.deleteEntityQuantity({ entityQuantity })
    );
  }

  public dispatchListEntitiesAction(): void {
    this.store.dispatch(entityQuantityActions.listEntityQuantities());
  }

  public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
    throw new Error('Method not implemented.');
  }

  public dispatchLoadEntityAction(uid: string): void {
    this.store.dispatch(entityQuantityActions.loadEntityQuantity({ uid }));
  }

  public dispatchSearch(term: string): void {
    this.store.dispatch(entityQuantityActions.search({ term }));
  }

  public dispatchSelectEntityQuantityAction(uid: string): void {
    this.store.dispatch(
      entityQuantityActions.selectEntityQuantity({ entityQuantityId: uid })
    );
  }

  public dispatchSetSelectedEntityIdAction(entityId: string): void {
    this.store.dispatch(
      entityQuantityActions.setSelectedEntityQuantityId({
        entityQuantityId: entityId,
      })
    );
  }

  public dispatchUpdateEntityAction(
    entityQuantity: EntityQuantityEntityUpdate
  ): void {
    this.store.dispatch(
      entityQuantityActions.updateEntityQuantity({ entityQuantity })
    );
  }

  public isLoading$(): Observable<boolean> {
    throw new Error('Method not implemented.');
  }

  public selectEntities$(): Observable<EntityQuantityEntity[]> {
    return this.store.pipe(
      select(entityQuantitySelectors.selectAllEntityQuantity)
    );
  }

  public selectEntityById$(
    uid: string
  ): Observable<EntityQuantityEntity | undefined> {
    return this.store.pipe(
      select(entityQuantitySelectors.selectEntityQuantityById(), { uid })
    );
  }

  public selectSelectedEntity$(): Observable<EntityQuantityEntity | undefined> {
    return this.store.pipe(
      select(entityQuantitySelectors.selectEntityQuantity)
    );
  }

  public selectSelectedEntityID$(): Observable<string> {
    return this.store.pipe(select(entityQuantitySelectors.getSelectedId));
  }

  public selectSelectedEntityId$(): Observable<string> {
    throw new Error('Method not implemented.');
  }
}
