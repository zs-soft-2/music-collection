import { Observable, ReplaySubject, Subject } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	BaseService,
	CollectionItemListConfig,
	CollectionItemStateService,
} from '@music-collection/api';

import { CollectionContentParams } from '../../api';

@Injectable()
export class CollectionContentService extends BaseService {
	private config: CollectionItemListConfig | null = null;
	private config$$: Subject<CollectionItemListConfig | null>;
	private params!: CollectionContentParams;
	private params$$: Subject<CollectionContentParams>;

	public constructor(
		private collectionItemStateService: CollectionItemStateService
	) {
		super();

		this.params$$ = new ReplaySubject();
		this.config$$ = new ReplaySubject();
	}

	public configChange(config: CollectionItemListConfig): void {
		this.config = config;

		this.collectionItemStateService.dispatchSetCollectionItemConfigAction(
			this.config
		);
	}

	public init$(): Observable<CollectionContentParams> {
		return this.params$$;
	}
}
