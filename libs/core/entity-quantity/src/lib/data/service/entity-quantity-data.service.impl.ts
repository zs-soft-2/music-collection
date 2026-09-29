import { defer, Observable, switchMap, take } from 'rxjs';

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
	AuthenticatedUserService,
	ENTITY_COUNT_COLLECTIONS,
	ENTITY_QUANTITY_FEATURE_KEY,
	EntityCounts,
	EntityQuantityDataService,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
	OWN_DATA_COUNT_COLLECTIONS,
	SearchParams,
} from '@music-collection/api';

/** Parent of the collectors' own data (`user/{uid}/…`). */
const USER_COLLECTION = 'user';

@Injectable()
export class EntityQuantityDataServiceImpl extends EntityQuantityDataService {
	private readonly injector = inject(Injector);
	private readonly authenticatedUser = inject(AuthenticatedUserService);

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
	 *
	 * The catalog is counted whole; a collector's own collections only under
	 * the collector (see `OWN_DATA_COUNT_COLLECTIONS`), which is also the
	 * only part of them the rules let anyone read.
	 */
	public count$(types: string[]): Observable<EntityCounts> {
		return this.authenticatedUser.user$.pipe(
			take(1),
			switchMap((user) =>
				defer(async () => {
					const entries = await Promise.all(
						types.map(async (type) => {
							const collectionId = ENTITY_COUNT_COLLECTIONS[type];

							if (!collectionId) {
								throw new Error(
									`No collection for entity type: ${type}`
								);
							}

							return [
								type,
								await this.count(
									collectionId,
									user?.uid ?? null
								),
							] as const;
						})
					);

					return Object.fromEntries(entries);
				})
			)
		);
	}

	/** The documents of one countable collection. */
	private async count(
		collectionId: string,
		uid: string | null
	): Promise<number> {
		const own = OWN_DATA_COUNT_COLLECTIONS.includes(collectionId);

		// A guest has no collection of their own, and asking would only earn
		// a refusal.
		if (own && !uid) {
			return 0;
		}

		// AngularFire expects its APIs in an injection context.
		const snapshot = await runInInjectionContext(this.injector, () =>
			getCountFromServer(
				own && uid
					? collection(
							this.firestore,
							USER_COLLECTION,
							uid,
							collectionId
						)
					: collectionGroup(this.firestore, collectionId)
			)
		);

		return snapshot.data().count;
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
