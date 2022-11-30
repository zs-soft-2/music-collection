import { Observable, ReplaySubject, Subject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	BaseService,
	collectionGroupByList,
	CollectionItemListConfig,
	CollectionItemStateService,
	CollectionSidebarParams,
	collectionSortByList,
} from '@music-collection/api';

@Injectable()
export class CollectionSidebarService extends BaseService {
	private params!: CollectionSidebarParams;
	private params$$: Subject<CollectionSidebarParams>;

	public selectedValue = 'default';

	public constructor(
		private collectionItemStateService: CollectionItemStateService
	) {
		super();

		this.params$$ = new ReplaySubject(1);
	}

	public init$(): Observable<CollectionSidebarParams> {
		return this.collectionItemStateService.selectEntities$().pipe(
			switchMap((entities) => {
				const artistNameSet: Set<string> = new Set();

				entities.forEach((entity) =>
					artistNameSet.add(entity.release.artist.name)
				);

				this.params = {
					config: {
						filterByArtistNames: null,
						sortBy: null,
						groupBy: null,
					},
					filterByArtistNameList: Array.from(artistNameSet.keys()),
					isSidebarVisible: false,
					groupByList: collectionGroupByList,
					sortByList: collectionSortByList,
				};

				this.params$$.next(this.params);

				return this.params$$.asObservable();
			})
		);
	}

	public openSidebar(): void {
		this.params.isSidebarVisible = true;

		this.params$$.next(this.params);
	}

	public getConfig(): CollectionItemListConfig {
		return { ...this.params.config };
	}
}
