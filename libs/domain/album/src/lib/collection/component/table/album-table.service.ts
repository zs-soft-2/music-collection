import { Observable, of, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	AlbumTableParams,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class AlbumTableService extends BaseComponent {
	private params!: AlbumTableParams;
	private params$$: ReplaySubject<AlbumTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private albumStateService: AlbumStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editAlbum(album: AlbumEntity): void {
		this.router.navigate(['../edit', album?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<AlbumTableParams> {
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
