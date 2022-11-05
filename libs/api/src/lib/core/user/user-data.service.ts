import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
} from '../../domain';
import { User } from './user';

export abstract class UserDataService extends EntityDataService<
	User,
	User,
	User
> {
	public abstract addCollectionItem$(
		collectionItem: CollectionItemModelAdd
	): Observable<CollectionItemModel>;
	public abstract updateCollectionItem$(
		collectionItem: CollectionItemModelUpdate
	): Observable<CollectionItemModelUpdate>;
}
