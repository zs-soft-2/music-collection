import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
  EntityQuantityEntity,
  EntityQuantityEntityAdd,
  EntityQuantityEntityUpdate,
} from './entity-quantity';

export abstract class EntityQuantityDataService extends EntityDataService<
  EntityQuantityEntity,
  EntityQuantityEntityAdd,
  EntityQuantityEntityUpdate
> {
  public abstract listByIds$(ids: string[]): Observable<EntityQuantityEntity[]>;
  public abstract search$(param: string): Observable<EntityQuantityEntity[]>;
}
