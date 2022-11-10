import { Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	DocumentEntity,
	DocumentStateService,
	DocumentTableParams,
	DocumentUtilService,
	EntityTypeEnum,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class DocumentTableService extends BaseComponent {
	private params!: DocumentTableParams;
	private params$$: ReplaySubject<DocumentTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private documentStateService: DocumentStateService,
		private documentUtilService: DocumentUtilService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editDocument(document: DocumentEntity): void {
		this.router.navigate(['../edit', document?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<DocumentTableParams> {
		return this.documentStateService.selectSearchResult$().pipe(
			switchMap((documents) => {
				this.params = {
					documents,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchHandler(term: string): void {
		const searchParams: SearchParams =
			this.documentUtilService.createSearchParams(
				EntityTypeEnum.Document,
				term
			);
		this.documentStateService.dispatchSearch(searchParams);
	}
}
