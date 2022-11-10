import { merge, Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	AlbumTableParams,
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

	public searchByName(term: string): void {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'searchParameters',
			value: term.toLowerCase(),
		};

		const searchParams: SearchParams = [
			{ entityType: EntityTypeEnum.Album, query },
		];

		this.albumStateService.dispatchSearch(searchParams);
	}

	public searchByArtistName(term: string): void {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'artist.searchParameters',
			value: term.toLowerCase(),
		};

		const searchParams: SearchParams = [
			{ entityType: EntityTypeEnum.Album, query },
		];

		this.albumStateService.dispatchSearch(searchParams);
	}
}
