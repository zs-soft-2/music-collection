import { map, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	DocumentEntity,
	DocumentStateService,
	DocumentTableParams,
	DocumentUtilService,
	EntityTypeEnum,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class DocumentTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private documentStateService = inject(DocumentStateService);
	private documentUtilService = inject(DocumentUtilService);
	private router = inject(Router);

	private params!: DocumentTableParams;
	private params$$: ReplaySubject<DocumentTableParams>;

	public readonly collectionView = createCollectionView(
		'mc.admin.documents.view'
	);

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editDocument(document: DocumentEntity): void {
		this.router.navigate(['../edit', document?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** The documents (the search result), the last changed first. */
	public init$(): Observable<DocumentTableParams> {
		return this.documentStateService.selectSearchResult$().pipe(
			map(sortByRecent),
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
