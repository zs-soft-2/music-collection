import { merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	EntityTypeEnum,
	ReleaseEntity,
	ReleaseStateService,
	ReleaseTableParams,
	ReleaseUtilService,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class ReleaseTableService extends BaseComponent {
	private params!: ReleaseTableParams;
	private params$$: ReplaySubject<ReleaseTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private releaseStateService: ReleaseStateService,
		private releaseUtilService: ReleaseUtilService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editRelease(release: ReleaseEntity): void {
		this.router.navigate(['../edit', release?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<ReleaseTableParams> {
		return merge(
			this.releaseStateService.selectSearchResult$(),
			this.releaseStateService.selectEntities$()
		).pipe(
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
