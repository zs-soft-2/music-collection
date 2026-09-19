import { defer, Observable } from 'rxjs';

import {
	inject,
	Injectable,
	Injector,
	runInInjectionContext,
} from '@angular/core';
import {
	collection,
	collectionGroup,
	doc,
	getCountFromServer,
} from '@angular/fire/firestore';
import {
	ENTITY_COUNT_COLLECTIONS,
	ENTITY_QUANTITY_FEATURE_KEY,
	EntityCounts,
	EntityQuantityDataService,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class EntityQuantityDataServiceImpl extends EntityQuantityDataService {
	private readonly injector = inject(Injector);

	public constructor() {
		super();

		this.featureKey = ENTITY_QUANTITY_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(
		entityQuantity: EntityQuantityEntityAdd
	): Observable<EntityQuantityEntity> {
		return super.addModel$(entityQuantity);
	}

	/**
	 * One aggregation query per type (billed as one read per 1000 documents),
	 * always from the server: the local cache may hold only part of a group.
	 */
	public count$(types: string[]): Observable<EntityCounts> {
		return defer(async () => {
			const entries = await Promise.all(
				types.map(async (type) => {
					const collectionId = ENTITY_COUNT_COLLECTIONS[type];

					if (!collectionId) {
						throw new Error(
							`No collection for entity type: ${type}`
						);
					}

					// AngularFire expects its APIs in an injection context.
					const snapshot = await runInInjectionContext(
						this.injector,
						() =>
							getCountFromServer(
								collectionGroup(this.firestore, collectionId)
							)
					);

					return [type, snapshot.data().count] as const;
				})
			);

			return Object.fromEntries(entries);
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
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<EntityQuantityEntity[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<EntityQuantityEntity | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<EntityQuantityEntity[]> {
		return super.searchModel$(params);
	}

	public update$(
		entityQuantity: EntityQuantityEntityUpdate
	): Observable<EntityQuantityEntityUpdate> {
		const newEntityQuantity: EntityQuantityEntity = {
			...entityQuantity,
		} as EntityQuantityEntity;

		return new Observable((subscriber) => {
			this.firestoreSync
				.set(
					doc(this.collection, entityQuantity.uid),
					ENTITY_QUANTITY_FEATURE_KEY,
					newEntityQuantity
				)
				.then(() => {
					subscriber.next({
						...newEntityQuantity,
					} as unknown as EntityQuantityEntity);
				});
		});
	}
}
