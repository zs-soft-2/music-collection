import {
	BehaviorSubject,
	combineLatest,
	map,
	Observable,
	ReplaySubject,
	switchMap,
} from 'rxjs';

import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	BaseComponent,
	DocumentCategoryEnum,
	DocumentEntity,
	DocumentFilterEnum,
	DocumentStateService,
	DocumentTableParams,
	DocumentUtilService,
	EntityTypeEnum,
	isWithdrawnDocument,
	SearchParams,
	sortByRecent,
} from '@music-collection/api';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

/** The tab the page was left on, the whole catalog when it is nothing known. */
function storedFilter(value: string): DocumentFilterEnum {
	return Object.values(DocumentFilterEnum).includes(
		value as DocumentFilterEnum
	)
		? (value as DocumentFilterEnum)
		: DocumentFilterEnum.All;
}

/** Which documents a tab shows. */
function matchesFilter(
	document: DocumentEntity,
	filter: DocumentFilterEnum
): boolean {
	if (filter === DocumentFilterEnum.Withdrawn) {
		return isWithdrawnDocument(document);
	}

	if (isWithdrawnDocument(document)) {
		return false;
	}

	if (filter === DocumentFilterEnum.Badge) {
		return document.category === DocumentCategoryEnum.Badge;
	}

	if (filter === DocumentFilterEnum.Other) {
		return !document.category;
	}

	return true;
}

@Injectable()
export class DocumentTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private documentStateService = inject(DocumentStateService);
	private documentUtilService = inject(DocumentUtilService);
	private router = inject(Router);

	private filter$$: BehaviorSubject<DocumentFilterEnum>;
	private params!: DocumentTableParams;
	private params$$: ReplaySubject<DocumentTableParams>;
	/** The term the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.documents.view'
	);

	public readonly place = createCollectionPlace('mc.admin.documents');

	/** The document the withdrawal is waiting on an answer for, if any. */
	public readonly pendingWithdrawal = signal<DocumentEntity | null>(null);

	public constructor() {
		super();

		this.filter$$ = new BehaviorSubject<DocumentFilterEnum>(
			storedFilter(this.place.filterOf('category'))
		);
		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(this.place.filterOf('name'));
	}

	/** Asks before withdrawing: what a badge cost is not a click away. */
	public askWithdrawal(document: DocumentEntity): void {
		this.pendingWithdrawal.set(document);
	}

	public cancelWithdrawal(): void {
		this.pendingWithdrawal.set(null);
	}

	/** Back to the whole catalog: the search is over. */
	public clearSearch(): void {
		this.place.setFilter('name', '');
		this.term$$.next('');
	}

	public confirmWithdrawal(): void {
		const document = this.pendingWithdrawal();

		if (document) {
			this.documentStateService.dispatchDeleteEntityAction(document);
			this.pendingWithdrawal.set(null);
		}
	}

	public editDocument(document: DocumentEntity): void {
		this.router.navigate(['../edit', document?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the document is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(document: DocumentEntity): unknown[] {
		return ['/document', document.uid];
	}

	/**
	 * What the list shows: the search result while a term is on, the whole
	 * catalog otherwise — the last changed first, so the page opens on the
	 * documents filed most recently instead of on nothing. The tab narrows
	 * it to one category, and the withdrawn ones are kept out of every tab
	 * but their own.
	 */
	public init$(): Observable<DocumentTableParams> {
		if (this.term$$.value) {
			this.dispatchSearch(this.term$$.value);
		}

		return combineLatest([
			this.documentStateService.selectEntities$(),
			this.documentStateService.selectSearchResult$(),
			this.term$$,
			this.filter$$,
		]).pipe(
			map(([documents, result, term, filter]) => ({
				documents: sortByRecent(
					(term ? result : documents).filter((document) =>
						matchesFilter(document, filter)
					)
				),
				empty: [],
				filter,
			})),
			switchMap((params) => {
				this.params = params;

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	/** Takes a withdrawn document back among the ones on offer. */
	public restoreDocument(document: DocumentEntity): void {
		this.documentStateService.dispatchRestoreEntityAction(document);
	}

	public searchHandler(term: string): void {
		this.place.setFilter('name', term);
		this.term$$.next(term);
		this.dispatchSearch(term);
	}

	public setFilter(filter: DocumentFilterEnum): void {
		this.pendingWithdrawal.set(null);
		this.place.setFilter('category', filter);
		this.filter$$.next(filter);
	}

	private dispatchSearch(term: string): void {
		const searchParams: SearchParams =
			this.documentUtilService.createSearchParams(
				EntityTypeEnum.Document,
				term
			);

		this.documentStateService.dispatchSearch(searchParams);
	}
}
