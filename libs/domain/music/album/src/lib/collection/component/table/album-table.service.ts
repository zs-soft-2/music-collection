import { map, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
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
	sortByRecent,
} from '@music-collection/api';
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class AlbumTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private albumStateService = inject(AlbumStateService);
	private artistStateService = inject(ArtistStateService);
	private albumUtilService = inject(AlbumUtilService);
	private router = inject(Router);

	private params!: AlbumTableParams;
	private params$$: ReplaySubject<AlbumTableParams>;

	public readonly collectionView = createCollectionView(
		'mc.admin.albums.view'
	);

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editAlbum(album: AlbumEntity): void {
		this.router.navigate(['../edit', album?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** The albums (or the search result), the last changed first. */
	public init$(): Observable<AlbumTableParams> {
		return merge(
			this.albumStateService.selectSearchResult$(),
			this.albumStateService.selectEntities$()
		).pipe(
			map(sortByRecent),
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
