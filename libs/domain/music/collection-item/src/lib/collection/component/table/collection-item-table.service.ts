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
	BaseComponent,
	CollectionItemEntity,
	CollectionItemStateService,
	CollectionItemTableParams,
	CollectionItemUtilService,
	EntityTypeEnum,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

/** Which box the list was last narrowed from — only one search runs at a time. */
type CollectionItemSearchField = 'artist' | 'name';

@Injectable()
export class CollectionItemTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private collectionItemStateService = inject(CollectionItemStateService);
	private collectionItemUtilService = inject(CollectionItemUtilService);
	private router = inject(Router);

	private params!: CollectionItemTableParams;
	private params$$: ReplaySubject<CollectionItemTableParams>;
	/** The term the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.collection-items.view'
	);

	public readonly place = createCollectionPlace('mc.admin.collection-items');

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(
			this.place.filterOf(this.searchedField() ?? 'name')
		);
	}

	/** Back to the whole collection: that search is over. */
	public clearSearch(field: CollectionItemSearchField): void {
		// Emptying the box that is not searched from leaves the list alone.
		if (this.searchedField() !== field) {
			return;
		}

		this.place.setFilter(field, '');
		this.term$$.next('');
	}

	public deleteCollectionItem(collectionItem: CollectionItemEntity): void {
		this.collectionItemStateService.dispatchDeleteEntityAction(
			collectionItem
		);
	}

	public editCollectionItem(collectionItem: CollectionItemEntity): void {
		this.router.navigate(['../edit', collectionItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the copy is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(collectionItem: CollectionItemEntity): unknown[] {
		return ['/collection/copy', collectionItem.uid];
	}

	/**
	 * The collection items (or the search result while a term is on), the last
	 * changed first. A search left behind is taken up again, so coming back
	 * from an item finds the list as it was.
	 */
	public init$(): Observable<CollectionItemTableParams> {
		const field = this.searchedField();

		if (field) {
			this.dispatchSearch(field, this.place.filterOf(field));
		}

		return combineLatest([
			this.collectionItemStateService.selectEntities$(),
			this.collectionItemStateService.selectSearchResult$(),
			this.term$$,
		]).pipe(
			map(([collectionItems, result, term]) => ({
				collectionItems: sortByRecent(term ? result : collectionItems),
				empty: [],
			})),
			switchMap((params) => {
				this.params = params;

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByArtistName(term: string): void {
		this.search('artist', term);
	}

	public searchByName(term: string): void {
		this.search('name', term);
	}

	private dispatchSearch(
		field: CollectionItemSearchField,
		term: string
	): void {
		const searchParams: SearchParams =
			field === 'artist'
				? this.collectionItemUtilService.createSearchParamsByArtist(
						EntityTypeEnum.CollectionItem,
						term
					)
				: this.collectionItemUtilService.createSearchParams(
						EntityTypeEnum.CollectionItem,
						term
					);

		this.collectionItemStateService.dispatchSearch(searchParams);
	}

	/** One search at a time: the box that is not searched from is emptied. */
	private search(field: CollectionItemSearchField, term: string): void {
		this.place.setFilter(field === 'artist' ? 'name' : 'artist', '');
		this.place.setFilter(field, term);
		this.term$$.next(term);
		this.dispatchSearch(field, term);
	}

	private searchedField(): CollectionItemSearchField | null {
		if (this.place.filterOf('artist')) {
			return 'artist';
		}

		return this.place.filterOf('name') ? 'name' : null;
	}
}
