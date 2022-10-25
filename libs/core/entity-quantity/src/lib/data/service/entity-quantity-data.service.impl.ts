import { nanoid } from 'nanoid';
import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	EntityQuantityDataService,
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class EntityQuantityDataServiceImpl extends EntityQuantityDataService {
	protected entityQuantityCollection: EntityQuantityEntity[];

	public constructor() {
		super();

		this.entityQuantityCollection = [];
	}

	public add$(
		entityQuantity: EntityQuantityEntityAdd
	): Observable<EntityQuantityEntity> {
		const newEntityQuantity: EntityQuantityEntity = {
			...entityQuantity,
			uid: nanoid(),
		};

		this.entityQuantityCollection.push(newEntityQuantity);

		return of(newEntityQuantity);
	}

	public delete$(
		entityQuantity: EntityQuantityEntity
	): Observable<EntityQuantityEntity> {
		return of(entityQuantity);
	}

	public list$(): Observable<EntityQuantityEntity[]> {
		return of(this.entityQuantityCollection);
	}

	public listByIds$(ids: string[]): Observable<EntityQuantityEntity[]> {
		const listByIds: EntityQuantityEntity[] = [];

		return of(
			this.entityQuantityCollection.reduce(
				(
					list: EntityQuantityEntity[],
					entityQuantity: EntityQuantityEntity
				) => {
					if (ids.includes(entityQuantity.uid)) {
						list.push(entityQuantity);
					}

					return list;
				},
				listByIds
			)
		);
	}

	public load$(uid: string): Observable<EntityQuantityEntity | undefined> {
		return of(
			this.entityQuantityCollection.find(
				(entityQuantity) => entityQuantity.uid === uid
			)
		);
	}

	public search$(param: string): Observable<EntityQuantityEntity[]> {
		throw new Error('Method not implemented.');
	}

	public update$(
		entityQuantity: EntityQuantityEntityUpdate
	): Observable<EntityQuantityEntityUpdate> {
		const index = this.entityQuantityCollection.findIndex(
			(oldEntityQuantity) => oldEntityQuantity.uid === entityQuantity.uid
		);

		if (index) {
			this.entityQuantityCollection[index] = {
				...this.entityQuantityCollection[index],
				...entityQuantity,
			};
		}

		return of(entityQuantity);
	}
}
