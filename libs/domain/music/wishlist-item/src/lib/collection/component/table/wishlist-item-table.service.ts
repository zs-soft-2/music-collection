import { first, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
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
} from '@music-collection/api';

@Injectable()
export class WishlistItemTableService extends BaseComponent {
	private params!: WishlistItemTableParams;
	private params$$: ReplaySubject<WishlistItemTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private wishlistItemStateService: WishlistItemStateService,
		private wishlistItemUtilService: WishlistItemUtilService,
		private exportImportService: ExportImportService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editWishlistItem(wishlistItem: WishlistItemEntity): void {
		this.router.navigate(['../edit', wishlistItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<WishlistItemTableParams> {
		return merge(
			this.wishlistItemStateService.selectSearchResult$(),
			this.wishlistItemStateService.selectEntities$()
		).pipe(
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
