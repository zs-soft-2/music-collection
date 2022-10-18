import { Observable } from 'rxjs';

import { BaseService } from '../base';

export abstract class StateService<R, S, T> extends BaseService {
  public abstract dispatchAddEntityAction(entity: S): void;
  public abstract dispatchDeleteEntityAction(entity: R): void;
  public abstract dispatchListEntitiesAction(): void;
  public abstract dispatchLoadEntitiesByIdsAction(ids: string[]): void;
  public abstract dispatchLoadEntityAction(id: string): void;
  public abstract dispatchSetSelectedEntityIdAction(entityId: string): void;
  public abstract dispatchUpdateEntityAction(entity: T): void;
  public abstract isLoading$(): Observable<boolean>;
  public abstract selectEntities$(): Observable<R[]>;
  public abstract selectEntityById$(entityId: string): Observable<R>;
  public abstract selectSelectedEntity$(): Observable<R | undefined>;
  public abstract selectSelectedEntityId$(): Observable<string>;
}
