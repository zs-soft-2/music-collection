import { map, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

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
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class ReleaseTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private releaseStateService = inject(ReleaseStateService);
	private releaseUtilService = inject(ReleaseUtilService);
	private router = inject(Router);

	private params!: ReleaseTableParams;
	private params$$: ReplaySubject<ReleaseTableParams>;

	public readonly collectionView = createCollectionView(
		'mc.admin.releases.view'
	);

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public deleteRelease(release: ReleaseEntity): void {
		this.releaseStateService.dispatchDeleteEntityAction(release);
	}

	public editRelease(release: ReleaseEntity): void {
		this.router.navigate(['../edit', release?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** The releases (or the search result), the last changed first. */
	public init$(): Observable<ReleaseTableParams> {
		return merge(
			this.releaseStateService.selectSearchResult$(),
			this.releaseStateService.selectEntities$()
		).pipe(
			map(sortByRecent),
			switchMap((releases) => {
				this.params = {
					releases,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchHandler(term: string): void {
		const searchParams: SearchParams =
			this.releaseUtilService.createSearchParams(
				EntityTypeEnum.Release,
				term
			);
		this.releaseStateService.dispatchSearch(searchParams);
	}
}
