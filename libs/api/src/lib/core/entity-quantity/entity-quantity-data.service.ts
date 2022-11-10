import { FirebaseDataService } from '../firebase';
import {
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from './entity-quantity';

export abstract class EntityQuantityDataService extends FirebaseDataService<
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate
> {}
