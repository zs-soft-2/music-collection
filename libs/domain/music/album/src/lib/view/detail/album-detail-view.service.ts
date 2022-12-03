import {
	combineLatest,
	Observable,
	ReplaySubject,
	Subject,
	switchMap,
} from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumDetailViewParams,
	BaseService,
	DynamicConfigEntity,
} from '@music-collection/api';

import { AlbumDetailViewStoreService } from './album-detail-view-store.service';

@Injectable()
export class AlbumDetailViewService extends BaseService {
	private params$$: Subject<AlbumDetailViewParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private storeService: AlbumDetailViewStoreService
	) {
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
