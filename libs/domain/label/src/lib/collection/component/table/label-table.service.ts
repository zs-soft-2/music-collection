import { first, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	LabelEntity,
	LabelStateService,
	LabelTableParams,
} from '@music-collection/api';

@Injectable()
export class LabelTableService extends BaseComponent {
	private params!: LabelTableParams;
	private params$$: ReplaySubject<LabelTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private labelStateService: LabelStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editLabel(label: LabelEntity): void {
		this.router.navigate(['../edit', label?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<LabelTableParams> {
		return merge(
			this.labelStateService.selectSearchResult$(),
			this.labelStateService.selectEntities$().pipe(first())
		).pipe(
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

	public searchHandler(query: string): void {
		this.labelStateService.dispatchSearch(query);
	}
}
