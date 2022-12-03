import { Observable, of, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumStateService,
	DynamicConfigEntity,
} from '@music-collection/api';
import { ComponentStore } from '@ngrx/component-store';

export interface AlbumDetailViewState {
	album: AlbumEntity | null;
	imageHeight: string;
	imageWidth: string;
}

@Injectable()
export class AlbumDetailViewStoreService extends ComponentStore<AlbumDetailViewState> {
	public readonly album$: Observable<AlbumEntity | null> = this.select(
		(state) => state.album
	);
	public readonly imageHeight$: Observable<string> = this.select(
		(state) => state.imageHeight
	);
	public readonly imageWidth$: Observable<string> = this.select(
		(state) => state.imageWidth
	);

	public constructor(private albumStateService: AlbumStateService) {
		super();
	}

	public init$(
		albumId: string,
		dynamicConfig: DynamicConfigEntity
	): Observable<boolean> {
		return this.albumStateService.selectEntityById$(albumId).pipe(
			switchMap((album) => {
				this.setState({
					album: album || null,
					imageHeight: dynamicConfig.config.imageHeight,
					imageWidth: dynamicConfig.config.imageWidth,
				});

				return of(true);
			})
		);
	}
}
