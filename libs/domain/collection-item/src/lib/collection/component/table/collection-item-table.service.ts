import { Observable, of, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	CollectionItemEntity,
	CollectionItemStateService,
	CollectionItemTableParams,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class CollectionItemTableService extends BaseComponent {
	private params!: CollectionItemTableParams;
	private params$$: ReplaySubject<CollectionItemTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private collectionItemStateService: CollectionItemStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editCollectionItem(collectionItem: CollectionItemEntity): void {
		this.router.navigate(['../edit', collectionItem?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<CollectionItemTableParams> {
		return this.collectionItemStateService.selectEntities$().pipe(
			switchMap((collectionItems) => {
				this.params = {
					collectionItems,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}
}
