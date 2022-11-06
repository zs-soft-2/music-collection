import { Observable, ReplaySubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	BaseComponent,
	CollectionItemEntity,
	CollectionItemListParams,
	CollectionItemStateService,
} from '@music-collection/api';

@Injectable()
export class CollectionItemListService extends BaseComponent {
	private params!: CollectionItemListParams;
	private params$$: ReplaySubject<CollectionItemListParams>;

	public constructor(
		private collectionItemStateService: CollectionItemStateService
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<CollectionItemListParams> {
		return this.collectionItemStateService.selectEntities$().pipe(
			map((collectionItems) => this.shuffleArray(collectionItems)),
			switchMap((collectionItems) => {
				this.params = {
					collectionItems,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	private shuffleArray(
		array: CollectionItemEntity[]
	): CollectionItemEntity[] {
		let size = array.length,
			t,
			i;

		while (size) {
			i = Math.floor(Math.random() * size--);
			t = array[size];
			array[size] = array[i];
			array[i] = t;
		}

		return array;
	}
}
