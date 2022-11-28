import { first, merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ArtistEntity,
	ArtistStateService,
	ArtistTableParams,
	ArtistUtilService,
	BaseComponent,
	EntityTypeEnum,
	ExportImportService,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class ArtistTableService extends BaseComponent {
	private params!: ArtistTableParams;
	private params$$: ReplaySubject<ArtistTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private artistStateService: ArtistStateService,
		private artistUtilService: ArtistUtilService,
		private exportImportService: ExportImportService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editArtist(artist: ArtistEntity): void {
		this.router.navigate(['../edit', artist?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public exportArtist(artist: ArtistEntity): void {
		this.exportImportService
			.createArtistExport(artist)
			.pipe(first())
			.subscribe();
	}

	public init$(): Observable<ArtistTableParams> {
		return merge(
			this.artistStateService.selectSearchResult$(),
			this.artistStateService.selectEntities$().pipe(first())
		).pipe(
			switchMap((artists) => {
				this.params = {
					artists,
					empty: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByName(term: string): void {
		const searchParams: SearchParams =
			this.artistUtilService.createSearchParams(
				EntityTypeEnum.Album,
				term
			);

		this.artistStateService.dispatchSearch(searchParams);
	}
}
