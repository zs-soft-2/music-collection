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
		this.term$$ = new BehaviorSubject<string>(this.place.filterOf('name'));
	}

	/** Back to the whole catalog: the search is over. */
	public clearSearch(): void {
		this.place.setFilter('name', '');
		this.term$$.next('');
	}

	public deleteRelease(release: ReleaseEntity): void {
		this.releaseStateService.dispatchDeleteEntityAction(release);
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
		if (this.term$$.value) {
			this.dispatchSearch(this.term$$.value);
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

	public searchHandler(term: string): void {
		this.place.setFilter('name', term);
		this.term$$.next(term);
		this.dispatchSearch(term);
	}

	private dispatchSearch(term: string): void {
		const searchParams: SearchParams =
			this.releaseUtilService.createSearchParams(
				EntityTypeEnum.Release,
				term
			);

		this.releaseStateService.dispatchSearch(searchParams);
	}
}
