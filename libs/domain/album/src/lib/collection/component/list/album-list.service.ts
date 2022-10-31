import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
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
			switchMap((albums) => {
				this.params = {
					albums,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}
}
