import { EntityStateService } from '../../common';
import {
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from './entity-quantity';

export abstract class EntityQuantityStateService extends EntityStateService<
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate
> {}
