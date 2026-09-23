import {
	BehaviorSubject,
	combineLatest,
	map,
	Observable,
	ReplaySubject,
	switchMap,
} from 'rxjs';

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
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

@Injectable()
export class WishlistItemTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private wishlistItemStateService = inject(WishlistItemStateService);
	private wishlistItemUtilService = inject(WishlistItemUtilService);
	private exportImportService = inject(ExportImportService);
	private router = inject(Router);

	private params!: WishlistItemTableParams;
	private params$$: ReplaySubject<WishlistItemTableParams>;
	/** The name the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.wishlist-items.view'
	);

	public readonly place = createCollectionPlace('mc.admin.wishlist-items');

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(this.place.filterOf('name'));
	}

	/** Back to the whole wishlist: the search is over. */
	public clearSearch(): void {
		this.place.setFilter('name', '');
		this.term$$.next('');
	}

	public editWishlistItem(wishlistItem: WishlistItemEntity): void {
		this.router.navigate(['../edit', wishlistItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the wishlist item is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(wishlistItem: WishlistItemEntity): unknown[] {
		return ['/wishlist', wishlistItem.uid];
	}

	/**
	 * The wishlist items (or the search result while a name is searched), the
	 * last changed first. A search left behind is taken up again, so coming
	 * back from an item finds the list as it was.
	 */
	public init$(): Observable<WishlistItemTableParams> {
		if (this.term$$.value) {
			this.dispatchSearch(this.term$$.value);
		}

		return combineLatest([
			this.wishlistItemStateService.selectEntities$(),
			this.wishlistItemStateService.selectSearchResult$(),
			this.term$$,
		]).pipe(
			map(([wishlistItems, result, term]) => ({
				wishlistItems: sortByRecent(term ? result : wishlistItems),
				empty: [],
			})),
			switchMap((params) => {
				this.params = params;

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByName(term: string): void {
		this.place.setFilter('name', term);
		this.term$$.next(term);
		this.dispatchSearch(term);
	}

	private dispatchSearch(term: string): void {
		const searchParams: SearchParams =
			this.wishlistItemUtilService.createSearchParams(
				EntityTypeEnum.WishlistItem,
				term
			);

		this.wishlistItemStateService.dispatchSearch(searchParams);
	}
}
