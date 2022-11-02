import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
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
	ENTITY_QUANTITY_FEATURE_KEY,
	EntityQuantityDataService,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class EntityQuantityDataServiceImpl extends EntityQuantityDataService {
	protected entityQuantityCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.entityQuantityCollection = collection(
			this.firestore,
			ENTITY_QUANTITY_FEATURE_KEY
		);
	}

	public add$(
		entityQuantity: EntityQuantityEntityAdd
	): Observable<EntityQuantityEntity> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newEntityQuantity: EntityQuantityEntity = {
			...entityQuantity,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(
				doc(this.entityQuantityCollection, uid),
				newEntityQuantity
			).then(() => {
				subscriber.next({
					...newEntityQuantity,
				} as unknown as EntityQuantityEntity);
			});
		});
	}

	public delete$(
		entityQuantity: EntityQuantityEntity
	): Observable<EntityQuantityEntity> {
		return this.update$(
			entityQuantity as EntityQuantityEntityUpdate
		) as Observable<EntityQuantityEntity>;
	}

	public list$(): Observable<EntityQuantityEntity[]> {
		return collectionData(this.entityQuantityCollection, {
			idField: 'uid',
		}) as Observable<EntityQuantityEntity[]>;
	}

	public listByIds$(ids: string[]): Observable<EntityQuantityEntity[]> {
		const entityQuantitysQuery = query(
			this.entityQuantityCollection,
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(entityQuantitysQuery).then((snapshot) => {
				subscriber.next(
					snapshot.docChanges() as unknown as EntityQuantityEntity[]
				);
			});
		});
	}

	public load$(uid: string): Observable<EntityQuantityEntity | undefined> {
		const entityQuantityDocument = doc(
			this.firestore,
			`${ENTITY_QUANTITY_FEATURE_KEY}/${uid}`
		);

		return docData(entityQuantityDocument, {
			idField: 'uid',
		}) as Observable<EntityQuantityEntity>;
	}

	public search$(term: string): Observable<EntityQuantityEntity[]> {
		const entityQuantityQuery = query(
			this.entityQuantityCollection,
			where('searchParameters', 'array-contains', term.toLowerCase())
		);

		return new Observable((subscriber) => {
			getDocs(entityQuantityQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as EntityQuantityEntity)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	public update$(
		entityQuantity: EntityQuantityEntityUpdate
	): Observable<EntityQuantityEntityUpdate> {
		const newEntityQuantity: EntityQuantityEntity = {
			...entityQuantity,
		} as EntityQuantityEntity;

		return new Observable((subscriber) => {
			setDoc(
				doc(this.entityQuantityCollection, entityQuantity.uid),
				newEntityQuantity
			).then(() => {
				subscriber.next({
					...newEntityQuantity,
				} as unknown as EntityQuantityEntity);
			});
		});
	}
}
