import { first, map, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	WishlistItemEntity,
	WishlistItemStateService,
	WishlistItemTableParams,
	WishlistItemUtilService,
	BaseComponent,
	EntityTypeEnum,
	ExportImportService,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class WishlistItemTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private wishlistItemStateService = inject(WishlistItemStateService);
	private wishlistItemUtilService = inject(WishlistItemUtilService);
	private exportImportService = inject(ExportImportService);
	private router = inject(Router);

	private params!: WishlistItemTableParams;
	private params$$: ReplaySubject<WishlistItemTableParams>;

	public readonly collectionView = createCollectionView(
		'mc.admin.wishlist-items.view'
	);

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editWishlistItem(wishlistItem: WishlistItemEntity): void {
		this.router.navigate(['../edit', wishlistItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** The wishlist items (or the search result), the last changed first. */
	public init$(): Observable<WishlistItemTableParams> {
		return merge(
			this.wishlistItemStateService.selectSearchResult$(),
			this.wishlistItemStateService.selectEntities$()
		).pipe(
			map(sortByRecent),
			switchMap((wishlistItems) => {
				this.params = {
					wishlistItems,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByName(term: string): void {
		const searchParams: SearchParams =
			this.wishlistItemUtilService.createSearchParams(
				EntityTypeEnum.WishlistItem,
				term
			);

		this.wishlistItemStateService.dispatchSearch(searchParams);
	}
}
