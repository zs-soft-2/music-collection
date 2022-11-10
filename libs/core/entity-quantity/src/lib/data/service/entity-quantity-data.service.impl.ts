import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, Firestore } from '@angular/fire/firestore';
import {
	ENTITY_QUANTITY_FEATURE_KEY,
	EntityQuantityDataService,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class EntityQuantityDataServiceImpl extends EntityQuantityDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

		this.featureKey = ENTITY_QUANTITY_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(
		entityQuantity: EntityQuantityEntityAdd
	): Observable<EntityQuantityEntity> {
		return super.addModel$(entityQuantity);
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
		return super.updateModel$(entityQuantity);
	}
}
