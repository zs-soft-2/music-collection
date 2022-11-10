import { merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	CollectionItemEntity,
	CollectionItemStateService,
	CollectionItemTableParams,
	CollectionItemUtilService,
	EntityTypeEnum,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class CollectionItemTableService extends BaseComponent {
	private params!: CollectionItemTableParams;
	private params$$: ReplaySubject<CollectionItemTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private collectionItemStateService: CollectionItemStateService,
		private collectionItemUtilService: CollectionItemUtilService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editCollectionItem(collectionItem: CollectionItemEntity): void {
		this.router.navigate(['../edit', collectionItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<CollectionItemTableParams> {
		return merge(
			this.collectionItemStateService.selectSearchResult$(),
			this.collectionItemStateService.selectEntities$()
		).pipe(
			switchMap((collectionItems) => {
				this.params = {
					collectionItems,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchHandler(term: string): void {
		const searchParams: SearchParams =
			this.collectionItemUtilService.createSearchParams(
				EntityTypeEnum.CollectionItem,
				term
			);
		this.collectionItemStateService.dispatchSearch(searchParams);
	}
}
