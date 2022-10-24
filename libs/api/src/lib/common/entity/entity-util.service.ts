import { FormGroup } from '@angular/forms';

import {
  EntityQuantityEntity,
  EntityQuantityEntityUpdate,
} from '../../core/entity-quantity';
import { BaseService } from '../base';

export abstract class EntityUtilService<T> extends BaseService {
  public abstract _sort(a: T, b: T): number;
  public abstract createFormGroup(entity: T | undefined): FormGroup;
  public abstract updateEntityQuantity(
    entityQuantity: EntityQuantityEntity
  ): EntityQuantityEntityUpdate;
}
