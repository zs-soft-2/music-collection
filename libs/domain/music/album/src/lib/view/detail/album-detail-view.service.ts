import {
	combineLatest,
	Observable,
	ReplaySubject,
	Subject,
	switchMap,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumDetailViewParams,
	BaseService,
	DynamicConfigEntity,
} from '@music-collection/api';

import { AlbumDetailViewStoreService } from './album-detail-view-store.service';

@Injectable()
export class AlbumDetailViewService extends BaseService {
	private activatedRoute = inject(ActivatedRoute);
	private storeService = inject(AlbumDetailViewStoreService);

	private params$$: Subject<AlbumDetailViewParams>;

	public constructor() {
		super();

		this.params$$ = new ReplaySubject(1);
	}

	public init$(): Observable<AlbumDetailViewParams> {
		const albumId: string =
			this.activatedRoute.snapshot.params['albumId'] || '';
		const dynamicConfig: DynamicConfigEntity = {
			uid: '1',
			componentId: 'AlbumDetailView',
			config: {
				imageHeight: '400',
				imageWidth: '400',
			},
		};

		return this.storeService.init$(albumId, dynamicConfig).pipe(
			switchMap(() =>
				combineLatest([
					this.storeService.album$,
					this.storeService.imageHeight$,
					this.storeService.imageWidth$,
				])
			),
			switchMap(([album, imageHeight, imageWidth]) => {
				this.params$$.next({
					album,
					imageHeight,
					imageWidth,
				});

				return this.params$$;
			})
		);
	}
}
