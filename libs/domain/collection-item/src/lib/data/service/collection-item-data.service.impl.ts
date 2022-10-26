import { nanoid } from 'nanoid';
import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	CollectionItemDataService,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class CollectionItemDataServiceImpl extends CollectionItemDataService {
	protected collectionItemCollection: CollectionItemEntity[];

	public constructor() {
		super();

		this.collectionItemCollection = [];
	}

	public add$(
		collectionItem: CollectionItemEntityAdd
	): Observable<CollectionItemEntity> {
		const newCollectionItem: CollectionItemEntity = {
			...collectionItem,
			uid: nanoid(),
		};

		this.collectionItemCollection = this.collectionItemCollection.concat([
			newCollectionItem,
		]);

		return of(newCollectionItem);
	}

	public delete$(
		collectionItem: CollectionItemEntity
	): Observable<CollectionItemEntity> {
		return of(collectionItem);
	}

	public list$(): Observable<CollectionItemEntity[]> {
		return of(this.collectionItemCollection);
	}

	public listByIds$(ids: string[]): Observable<CollectionItemEntity[]> {
		const listByIds: CollectionItemEntity[] = [];

		return of(
			this.collectionItemCollection.reduce(
				(
					list: CollectionItemEntity[],
					collectionItem: CollectionItemEntity
				) => {
					if (ids.includes(collectionItem.uid)) {
						list.push(collectionItem);
					}

					return list;
				},
				listByIds
			)
		);
	}

	public load$(uid: string): Observable<CollectionItemEntity | undefined> {
		return of(
			this.collectionItemCollection.find(
				(collectionItem) => collectionItem.uid === uid
			)
		);
	}

	public search$(query: string): Observable<CollectionItemEntity[]> {
		const foundByQuery: CollectionItemEntity[] = [];

		return of(
			this.collectionItemCollection.reduce(
				(
					list: CollectionItemEntity[],
					collectionItem: CollectionItemEntity
				) => {
					if (
						collectionItem.release.name
							.toLowerCase()
							.search(query.toLowerCase()) > -1
					) {
						list.push(collectionItem);
					}

					return list;
				},
				foundByQuery
			)
		);
	}

	public update$(
		collectionItem: CollectionItemEntityUpdate
	): Observable<CollectionItemEntityUpdate> {
		this.collectionItemCollection = this.collectionItemCollection.map(
			(oldCollectionItem) => {
				return (
					oldCollectionItem.uid === collectionItem.uid
						? {
								...oldCollectionItem,
								...collectionItem,
						  }
						: oldCollectionItem
				) as CollectionItemEntity;
			}
		);

		return of(collectionItem);
	}
}
