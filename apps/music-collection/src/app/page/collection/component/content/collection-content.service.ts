import { Observable, ReplaySubject, Subject } from 'rxjs';

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
	BaseService,
	CollectionItemEntity,
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
		private collectionItemStateService: CollectionItemStateService,
		private router: Router
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

	public selectCollectionItem(collectionItem: CollectionItemEntity): void {
		this.router.navigate(['album', collectionItem.release.album.uid]);
	}
}
