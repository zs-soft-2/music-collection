import {
	BehaviorSubject,
	combineLatest,
	first,
	map,
	Observable,
	ReplaySubject,
	switchMap,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
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
	sortByRecent,
} from '@music-collection/api';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

@Injectable()
export class ArtistTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private artistStateService = inject(ArtistStateService);
	private artistUtilService = inject(ArtistUtilService);
	private exportImportService = inject(ExportImportService);
	private router = inject(Router);

	private params!: ArtistTableParams;
	private params$$: ReplaySubject<ArtistTableParams>;
	/** The name the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.artists.view'
	);

	public readonly place = createCollectionPlace('mc.admin.artists');

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(this.place.filterOf('name'));
	}

	/** Back to the whole catalog: the search is over. */
	public clearSearch(): void {
		this.place.setFilter('name', '');
		this.term$$.next('');
	}

	public editArtist(artist: ArtistEntity): void {
		this.router.navigate(['../edit', artist?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the artist is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(artist: ArtistEntity): unknown[] {
		return ['/artist', artist.uid];
	}

	public exportArtist(artist: ArtistEntity): void {
		this.exportImportService
			.createArtistExport(artist)
			.pipe(first())
			.subscribe();
	}

	/**
	 * The artists (or the search result while a name is searched), the last
	 * changed first. A search left behind is taken up again, so coming back
	 * from an artist finds the list as it was.
	 */
	public init$(): Observable<ArtistTableParams> {
		const term = this.term$$.value;

		if (term) {
			this.dispatchSearch(term);
		}

		return combineLatest([
			this.artistStateService.selectEntities$(),
			this.artistStateService.selectSearchResult$(),
			this.term$$,
		]).pipe(
			map(([artists, result, term]) => ({
				artists: sortByRecent(term ? result : artists),
				empty: [],
			})),
			switchMap((params) => {
				this.params = params;

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByName(term: string): void {
		this.place.setFilter('name', term);
		this.term$$.next(term);
		this.dispatchSearch(term);
	}

	private dispatchSearch(term: string): void {
		const searchParams: SearchParams =
			this.artistUtilService.createSearchParams(
				EntityTypeEnum.Artist,
				term
			);

		this.artistStateService.dispatchSearch(searchParams);
	}
}
