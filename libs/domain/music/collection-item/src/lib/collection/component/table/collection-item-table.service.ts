import { map, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	CollectionItemEntity,
	CollectionItemStateService,
	CollectionItemTableParams,
	CollectionItemUtilService,
	EntityTypeEnum,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class CollectionItemTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private collectionItemStateService = inject(CollectionItemStateService);
	private collectionItemUtilService = inject(CollectionItemUtilService);
	private router = inject(Router);

	private params!: CollectionItemTableParams;
	private params$$: ReplaySubject<CollectionItemTableParams>;

	public readonly collectionView = createCollectionView(
		'mc.admin.collection-items.view'
	);

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editCollectionItem(collectionItem: CollectionItemEntity): void {
		this.router.navigate(['../edit', collectionItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** The collection items (or the search result), the last changed first. */
	public init$(): Observable<CollectionItemTableParams> {
		return merge(
			this.collectionItemStateService.selectSearchResult$(),
			this.collectionItemStateService.selectEntities$()
		).pipe(
			map(sortByRecent),
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

	public searchByName(term: string): void {
		const searchParams: SearchParams =
			this.collectionItemUtilService.createSearchParams(
				EntityTypeEnum.CollectionItem,
				term
			);
		this.collectionItemStateService.dispatchSearch(searchParams);
	}

	public searchByArtistName(term: string): void {
		const searchParams: SearchParams =
			this.collectionItemUtilService.createSearchParamsByArtist(
				EntityTypeEnum.CollectionItem,
				term
			);
		this.collectionItemStateService.dispatchSearch(searchParams);
	}

	public deleteCollectionItem(collectionItem: CollectionItemEntity): void {
		this.collectionItemStateService.dispatchDeleteEntityAction(
			collectionItem
		);
	}
}
