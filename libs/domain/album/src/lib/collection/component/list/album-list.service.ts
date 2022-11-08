import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumListParams,
	AlbumStateService,
	ComponentBaseService,
} from '@music-collection/api';

@Injectable()
export class AlbumListService extends ComponentBaseService<AlbumListParams> {
	public constructor(private albumStateService: AlbumStateService) {
		super();
	}

	public init$(): Observable<AlbumListParams> {
		return this.albumStateService.selectEntities$().pipe(
			map((albums) => this.shuffleArray(albums)),
			switchMap((albums) => {
				this.params = this.updateParams(this.params, albums);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	private updateParams(
		params: AlbumListParams,
		albums: AlbumEntity[]
	): AlbumListParams {
		let newParams: AlbumListParams;

		if (!params) {
			newParams = {
				albums,
			};
		} else {
			params.albums = albums;

			newParams = params;
		}

		return newParams;
	}

	private shuffleArray(array: AlbumEntity[]): AlbumEntity[] {
		let m = array.length,
			t,
			i;

		while (m) {
			i = Math.floor(Math.random() * m--);
			t = array[m];
			array[m] = array[i];
			array[i] = t;
		}

		return array;
	}
}
