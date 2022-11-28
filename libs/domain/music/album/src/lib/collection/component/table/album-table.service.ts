import { merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	AlbumTableParams,
	AlbumUtilService,
	ArtistStateService,
	BaseComponent,
	EntityTypeEnum,
	ParamItem,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class AlbumTableService extends BaseComponent {
	private params!: AlbumTableParams;
	private params$$: ReplaySubject<AlbumTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private albumStateService: AlbumStateService,
		private artistStateService: ArtistStateService,
		private albumUtilService: AlbumUtilService,
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
		return merge(
			this.albumStateService.selectSearchResult$(),
			this.albumStateService.selectEntities$()
		).pipe(
			switchMap((albums) => {
				this.params = {
					albums,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByArtistName(term: string): void {
		const searchParams: SearchParams =
			this.albumUtilService.createSearchParamsByArtist(
				EntityTypeEnum.Album,
				term.toLowerCase()
			);

		this.albumStateService.dispatchSearch(searchParams);
	}

	public searchByName(term: string): void {
		const searchParams: SearchParams =
			this.albumUtilService.createSearchParams(
				EntityTypeEnum.Album,
				term.toLowerCase()
			);

		this.albumStateService.dispatchSearch(searchParams);
	}
}
