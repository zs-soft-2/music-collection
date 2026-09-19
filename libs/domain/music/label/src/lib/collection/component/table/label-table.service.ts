import { map, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	EntityTypeEnum,
	LabelEntity,
	LabelStateService,
	LabelTableParams,
	LabelUtilService,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class LabelTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private labelStateService = inject(LabelStateService);
	private labelUtilService = inject(LabelUtilService);
	private router = inject(Router);

	private params!: LabelTableParams;
	private params$$: ReplaySubject<LabelTableParams>;

	public readonly collectionView = createCollectionView(
		'mc.admin.labels.view'
	);

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editLabel(label: LabelEntity): void {
		this.router.navigate(['../edit', label?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** The labels (or the search result), the last changed first. */
	public init$(): Observable<LabelTableParams> {
		return merge(
			this.labelStateService.selectSearchResult$(),
			this.labelStateService.selectEntities$()
		).pipe(
			map(sortByRecent),
			switchMap((labels) => {
				this.params = {
					labels,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchHandler(term: string): void {
		const searchParams: SearchParams =
			this.labelUtilService.createSearchParams(
				EntityTypeEnum.Label,
				term
			);

		this.labelStateService.dispatchSearch(searchParams);
	}
}
