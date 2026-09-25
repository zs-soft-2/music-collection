import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	collection,
	collectionGroup,
	CollectionReference,
	doc,
	docSnapshots,
	DocumentData,
	Firestore,
	getDocs,
	query,
	QueryConstraint,
	where,
} from '@angular/fire/firestore';

import { Entity, EntityDataService, SearchParams } from '../../common';
import {
	FirestoreSyncService,
	toSyncedData,
	withLocalUpdatedAt,
} from './firestore-sync.service';

@Injectable()
export abstract class FirebaseDataService<
	R extends Entity,
	S,
	T extends Entity,
> extends EntityDataService<R, S, T> {
	protected firestore = inject(Firestore);
	protected firestoreSync = inject(FirestoreSyncService);

	protected collection!: CollectionReference<DocumentData>;
	protected featureKey!: string;

	/**
	 * One write, then done: the stream completes, so an operator that waits
	 * for the end of it — `concatMap`, `forkJoin`, `toArray` — moves on
	 * instead of holding the caller forever. A failed write is reported as
	 * an error for the same reason: a silent stop looks like a slow save.
	 */
	protected addModel$(entityAdd: S): Observable<R> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newEntity = {
			...entityAdd,
			uid,
		};

		return new Observable((subscriber) => {
			this.firestoreSync
				.set(doc(this.collection, uid), this.featureKey, newEntity)
				.then(() => {
					subscriber.next(
						withLocalUpdatedAt(newEntity) as unknown as R
					);
					subscriber.complete();
				})
				.catch((error) => subscriber.error(error));
		});
	}

	protected deleteModel$(entity: R): Observable<R> {
		return this.updateModel$(
			entity as unknown as T
		) as unknown as Observable<R>;
	}

	protected listModels$(): Observable<R[]> {
		return this.firestoreSync.list$<R>({
			featureKey: this.featureKey,
			query: collectionGroup(this.firestore, this.featureKey),
			incremental: true,
		});
	}

	protected listModelsByIds$(ids: string[]): Observable<R[]> {
		const albumsQuery = query(
			collectionGroup(this.firestore, this.featureKey),
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(albumsQuery)
				.then((snapshots) => {
					const entities: R[] = [];

					snapshots.forEach((doc) => {
						entities.push(toSyncedData(doc) as unknown as R);
					});

					subscriber.next(entities);
					subscriber.complete();
				})
				.catch((error) => subscriber.error(error));
		});
	}

	protected loadModel$(uid: string): Observable<R | undefined> {
		const albumDocument = doc(this.firestore, `${this.featureKey}/${uid}`);

		return docSnapshots(albumDocument).pipe(
			map((snapshot) =>
				snapshot.exists()
					? ({ ...toSyncedData(snapshot), uid: snapshot.id } as R)
					: undefined
			)
		);
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
									...toSyncedData(doc),
								}) as unknown as R
						)
					);
					subscriber.complete();
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
			this.firestoreSync
				.set(
					doc(this.collection, entity.uid),
					this.featureKey,
					newEntity
				)
				.then(() => {
					subscriber.next(
						withLocalUpdatedAt(newEntity) as unknown as T
					);
					subscriber.complete();
				})
				.catch((error) => subscriber.error(error));
		});
	}
}
