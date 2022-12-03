import { Observable, of, switchMap } from 'rxjs';

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
	QueryConstraint,
	setDoc,
	updateDoc,
	where,
} from '@angular/fire/firestore';

import { Entity, EntityDataService, SearchParams } from '../../common';

@Injectable()
export abstract class FirebaseDataService<
	R extends Entity,
	S,
	T extends Entity
> extends EntityDataService<R, S, T> {
	protected collection!: CollectionReference<DocumentData>;
	protected featureKey!: string;

	public constructor(protected firestore: Firestore) {
		super();
	}

	protected addModel$(entityAdd: S): Observable<R> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newEntity = {
			...entityAdd,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(doc(this.collection, uid), newEntity).then(() => {
				subscriber.next({ ...newEntity } as unknown as R);
			});
		});
	}

	protected deleteModel$(entity: R): Observable<R> {
		return this.updateModel$(
			entity as unknown as T
		) as unknown as Observable<R>;
	}

	protected listModels$(): Observable<R[]> {
		return collectionData(
			collectionGroup(this.firestore, this.featureKey),
			{
				idField: 'uid',
			}
		) as Observable<R[]>;
	}

	protected listModelsByIds$(ids: string[]): Observable<R[]> {
		const albumsQuery = query(
			collectionGroup(this.firestore, this.featureKey),
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(albumsQuery).then((snapshots) => {
				const entities: R[] = [];

				snapshots.forEach((doc) => {
					entities.push(doc.data() as unknown as R);
				});

				subscriber.next(entities);
			});
		});
	}

	protected loadModel$(uid: string): Observable<R | undefined> {
		const albumDocument = doc(this.firestore, `${this.featureKey}/${uid}`);

		return docData(albumDocument, {
			idField: 'uid',
		}) as Observable<R>;
	}

	protected searchModel$(params: SearchParams): Observable<R[]> {
		const queries: QueryConstraint[] = params.map((param) =>
			where(param.query.field, param.query.operation, param.query.value)
		);

		const entityQuery = query(
			collectionGroup(this.firestore, this.featureKey),
			...queries
		);

		return new Observable((subscriber) => {
			getDocs(entityQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as R)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	protected updateModel$(entity: T): Observable<T> {
		const newEntity: T = {
			...entity,
		} as T;

		return new Observable((subscriber) => {
			setDoc(doc(this.collection, entity.uid), newEntity).then(() => {
				subscriber.next({
					...newEntity,
				} as unknown as T);
			});
		});
	}
}
