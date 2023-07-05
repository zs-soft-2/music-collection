import { Observable, ReplaySubject, Subject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	BaseService,
	CollectionGroupByEnum,
	collectionGroupByList,
	CollectionItemListConfig,
	CollectionItemStateService,
	CollectionSidebarParams,
	CollectionSortByEnum,
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

	public getConfig(): CollectionItemListConfig {
		const config = this.params.config;

		return {
			...config,
			filterByArtistNames:
				config.filterByArtistNames &&
				config.filterByArtistNames.length === 0
					? null
					: config.filterByArtistNames,
		};
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
						sortBy: CollectionSortByEnum.ascArtistName,
						groupBy: [CollectionGroupByEnum.artist],
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
}
