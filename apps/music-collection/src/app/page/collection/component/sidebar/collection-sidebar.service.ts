import { Observable, ReplaySubject, Subject } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	BaseService,
	collectionGroupByList,
	CollectionItemListConfig,
	CollectionSidebarParams,
	collectionSortByList,
} from '@music-collection/api';

@Injectable()
export class CollectionSidebarService extends BaseService {
	private params!: CollectionSidebarParams;
	private params$$: Subject<CollectionSidebarParams>;

	public selectedValue = 'default';

	public constructor() {
		super();

		this.params$$ = new ReplaySubject(1);
	}

	public init$(): Observable<CollectionSidebarParams> {
		this.params = {
			config: {
				sortBy: null,
				groupBy: null,
			},
			isSidebarVisible: false,
			groupByList: collectionGroupByList,
			sortByList: collectionSortByList,
		};

		this.params$$.next(this.params);

		return this.params$$.asObservable();
	}

	public openSidebar(): void {
		this.params.isSidebarVisible = true;

		this.params$$.next(this.params);
	}

	public getConfig(): CollectionItemListConfig {
		return { ...this.params.config };
	}
}
