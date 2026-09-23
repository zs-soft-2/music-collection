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
	LabelEntity,
	LabelStateService,
	LabelTableParams,
	LabelUtilService,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

@Injectable()
export class LabelTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private labelStateService = inject(LabelStateService);
	private labelUtilService = inject(LabelUtilService);
	private router = inject(Router);

	private params!: LabelTableParams;
	private params$$: ReplaySubject<LabelTableParams>;
	/** The term the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.labels.view'
	);

	public readonly place = createCollectionPlace('mc.admin.labels');

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

	public editLabel(label: LabelEntity): void {
		this.router.navigate(['../edit', label?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the label is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(label: LabelEntity): unknown[] {
		return ['/label', label.uid];
	}

	/**
	 * The labels (or the search result while a term is on), the last changed
	 * first. A search left behind is taken up again, so coming back from a
	 * label finds the list as it was.
	 */
	public init$(): Observable<LabelTableParams> {
		if (this.term$$.value) {
			this.dispatchSearch(this.term$$.value);
		}

		return combineLatest([
			this.labelStateService.selectEntities$(),
			this.labelStateService.selectSearchResult$(),
			this.term$$,
		]).pipe(
			map(([labels, result, term]) => ({
				labels: sortByRecent(term ? result : labels),
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
			this.labelUtilService.createSearchParams(
				EntityTypeEnum.Label,
				term
			);

		this.labelStateService.dispatchSearch(searchParams);
	}
}
