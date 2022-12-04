import { Observable } from 'rxjs';

import {
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
} from '../../domain';
import { FirebaseDataService } from '../firebase';
import { User } from './user';

export abstract class UserDataService extends FirebaseDataService<
	User,
	User,
	User
> {
	public abstract addCollectionItem$(
		collectionItem: CollectionItemModelAdd
	): Observable<CollectionItemModel>;
	public abstract deleteCollectionItem$(
		collectionItem: CollectionItemModel
	): Observable<CollectionItemModel>;
	public abstract updateCollectionItem$(
		collectionItem: CollectionItemModelUpdate
	): Observable<CollectionItemModelUpdate>;
}
