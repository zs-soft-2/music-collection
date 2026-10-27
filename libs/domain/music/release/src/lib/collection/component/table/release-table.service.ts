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
	EntityTypeEnum,
	ReleaseEntity,
	ReleaseStateService,
	ReleaseTableParams,
	ReleaseUtilService,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

/** Which box the list was last narrowed from — only one search runs at a time. */
type ReleaseSearchField = 'artist' | 'name';

@Injectable()
export class ReleaseTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private releaseStateService = inject(ReleaseStateService);
	private releaseUtilService = inject(ReleaseUtilService);
	private router = inject(Router);

	private params!: ReleaseTableParams;
	private params$$: ReplaySubject<ReleaseTableParams>;
	/** The term the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.releases.view'
	);

	public readonly place = createCollectionPlace('mc.admin.releases');

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(
			this.place.filterOf(this.searchedField() ?? 'name')
		);
	}

	/** Back to the whole catalog: that search is over. */
	public clearSearch(field: ReleaseSearchField): void {
		// Emptying the box that is not searched from leaves the list alone.
		if (this.searchedField() !== field) {
			return;
		}

		this.place.setFilter(field, '');
		this.term$$.next('');
	}

	public editRelease(release: ReleaseEntity): void {
		this.router.navigate(['../edit', release?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the release is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(release: ReleaseEntity): unknown[] {
		return ['/release', release.uid];
	}

	/**
	 * The releases (or the search result while a term is on), the last changed
	 * first. A search left behind is taken up again, so coming back from a
	 * release finds the list as it was.
	 */
	public init$(): Observable<ReleaseTableParams> {
		const field = this.searchedField();

		if (field) {
			this.dispatchSearch(field, this.place.filterOf(field));
		}

		return combineLatest([
			this.releaseStateService.selectEntities$(),
			this.releaseStateService.selectSearchResult$(),
			this.term$$,
		]).pipe(
			map(([releases, result, term]) => ({
				releases: sortByRecent(term ? result : releases),
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

	private dispatchSearch(field: ReleaseSearchField, term: string): void {
		if (field === 'artist') {
			this.releaseStateService.dispatchSearchByArtistName(term);

			return;
		}

		const searchParams: SearchParams =
			this.releaseUtilService.createSearchParams(
				EntityTypeEnum.Release,
				term
			);

		this.releaseStateService.dispatchSearch(searchParams);
	}

	/** One search at a time: the box that is not searched from is emptied. */
	private search(field: ReleaseSearchField, term: string): void {
		this.place.setFilter(field === 'artist' ? 'name' : 'artist', '');
		this.place.setFilter(field, term);
		this.term$$.next(term);
		this.dispatchSearch(field, term);
	}

	private searchedField(): ReleaseSearchField | null {
		if (this.place.filterOf('artist')) {
			return 'artist';
		}

		return this.place.filterOf('name') ? 'name' : null;
	}
}
