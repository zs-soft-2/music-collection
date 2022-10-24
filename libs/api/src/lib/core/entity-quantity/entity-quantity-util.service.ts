import { EntityTypeEnum } from '../../common';
import {
  EntityQuantityEntity,
  EntityQuantityEntityAdd,
} from './entity-quantity';

export abstract class EntityQuantityUtilService {
  public abstract createEntityQuantity(
    type: EntityTypeEnum
  ): EntityQuantityEntity;
  public abstract createEntityQuantityItem(
    name: string,
    type: EntityTypeEnum
  ): EntityQuantityEntityAdd;
}
