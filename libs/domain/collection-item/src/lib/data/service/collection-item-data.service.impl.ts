import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
	collectionGroup,
	CollectionReference,
	doc,
	docData,
	DocumentData,
	Firestore,
	getDocs,
	query,
	setDoc,
	updateDoc,
	where,
} from '@angular/fire/firestore';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	CollectionItemDataService,
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
} from '@music-collection/api';

@Injectable()
export class CollectionItemDataServiceImpl extends CollectionItemDataService {
	protected albumCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.albumCollection = collection(
			this.firestore,
			COLLECTION_ITEM_FEATURE_KEY
		);
	}

	public add$(
		album: CollectionItemModelAdd
	): Observable<CollectionItemModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newCollectionItem: CollectionItemModel = {
			...album,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(doc(this.albumCollection, uid), newCollectionItem).then(
				() => {
					subscriber.next({
						...newCollectionItem,
					} as unknown as CollectionItemModel);
				}
			);
		});
	}

	public delete$(
		album: CollectionItemModel
	): Observable<CollectionItemModel> {
		return this.update$(
			album as CollectionItemModelUpdate
		) as Observable<CollectionItemModel>;
	}

	public list$(): Observable<CollectionItemModel[]> {
		return collectionData(
			collectionGroup(this.firestore, COLLECTION_ITEM_FEATURE_KEY),
			{
				idField: 'uid',
			}
		) as Observable<CollectionItemModel[]>;
	}

	public listByIds$(ids: string[]): Observable<CollectionItemModel[]> {
		const albumsQuery = query(
			collectionGroup(this.firestore, COLLECTION_ITEM_FEATURE_KEY),
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(albumsQuery).then((snapshot) => {
				subscriber.next(
					snapshot.docChanges() as unknown as CollectionItemModel[]
				);
			});
		});
	}

	public load$(uid: string): Observable<CollectionItemModel | undefined> {
		const albumDocument = doc(
			this.firestore,
			`${COLLECTION_ITEM_FEATURE_KEY}/${uid}`
		);

		return docData(albumDocument, {
			idField: 'uid',
		}) as Observable<CollectionItemModel>;
	}

	public search$(term: string): Observable<CollectionItemModel[]> {
		const albumQuery = query(
			collectionGroup(this.firestore, COLLECTION_ITEM_FEATURE_KEY),
			where('searchParameters', 'array-contains', term.toLowerCase())
		);

		return new Observable((subscriber) => {
			getDocs(albumQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as CollectionItemModel)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
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
