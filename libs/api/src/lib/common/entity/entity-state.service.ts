import { Observable } from 'rxjs';

import { StateService } from '../state';

export abstract class EntityStateService<R, S, T> extends StateService {
  public abstract dispatchAddEntityAction(entity: S): void;
  public abstract dispatchDeleteEntityAction(entity: R): void;
  public abstract dispatchListEntitiesAction(): void;
  public abstract dispatchLoadEntitiesByIdsAction(ids: string[]): void;
  public abstract dispatchLoadEntityAction(id: string): void;
  public abstract dispatchSetSelectedEntityIdAction(entityId: string): void;
  public abstract dispatchUpdateEntityAction(entity: T): void;
  public abstract selectEntities$(): Observable<R[]>;
  public abstract selectEntityById$(
    entityId: string
  ): Observable<R | undefined>;
  public abstract selectSelectedEntity$(): Observable<R | undefined>;
  public abstract selectSelectedEntityId$(): Observable<string>;
}
