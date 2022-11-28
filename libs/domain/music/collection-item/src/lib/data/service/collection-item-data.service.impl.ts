import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, doc, Firestore, updateDoc } from '@angular/fire/firestore';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	CollectionItemDataService,
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class CollectionItemDataServiceImpl extends CollectionItemDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

		this.featureKey = COLLECTION_ITEM_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(
		collectionItem: CollectionItemModelAdd
	): Observable<CollectionItemModel> {
		return super.addModel$(collectionItem);
	}

	public delete$(
		collectionItem: CollectionItemModel
	): Observable<CollectionItemModel> {
		return this.update$(
			collectionItem as CollectionItemModelUpdate
		) as Observable<CollectionItemModel>;
	}

	public list$(): Observable<CollectionItemModel[]> {
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<CollectionItemModel[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<CollectionItemModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<CollectionItemModel[]> {
		return super.searchModel$(params);
	}

	public update$(
		album: CollectionItemModelUpdate
	): Observable<CollectionItemModelUpdate> {
		const albumDocument = doc(
			this.firestore,
			`${COLLECTION_ITEM_FEATURE_KEY}/${album.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(albumDocument, { ...album }).then(() => {
				subscriber.next(album);
			});
		});
	}
}
