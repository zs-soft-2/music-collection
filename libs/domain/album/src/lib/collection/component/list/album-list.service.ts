import { Observable, ReplaySubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumListParams,
	AlbumStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class AlbumListService extends BaseComponent {
	private params!: AlbumListParams;
	private params$$: ReplaySubject<AlbumListParams>;

	public constructor(private albumStateService: AlbumStateService) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<AlbumListParams> {
		return this.albumStateService.selectEntities$().pipe(
			map((albums) => this.shuffleArray(albums)),
			switchMap((albums) => {
				this.params = {
					albums,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
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
