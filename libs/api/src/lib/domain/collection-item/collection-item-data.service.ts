import { FirebaseDataService } from '../../core';
import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
} from './collection-item';

export abstract class CollectionItemDataService extends FirebaseDataService<
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate
> {}
