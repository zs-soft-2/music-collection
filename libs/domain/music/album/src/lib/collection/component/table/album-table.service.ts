import {
	BehaviorSubject,
	combineLatest,
	map,
	Observable,
	ReplaySubject,
	switchMap,
} from 'rxjs';

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
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

/** Which box the list was last narrowed from — only one search runs at a time. */
type AlbumSearchField = 'artist' | 'name';

@Injectable()
export class AlbumTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private albumStateService = inject(AlbumStateService);
	private artistStateService = inject(ArtistStateService);
	private albumUtilService = inject(AlbumUtilService);
	private router = inject(Router);

	private params!: AlbumTableParams;
	private params$$: ReplaySubject<AlbumTableParams>;
	/** The term the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;

	public readonly collectionView = createCollectionView(
		'mc.admin.albums.view'
	);

	public readonly place = createCollectionPlace('mc.admin.albums');

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(
			this.place.filterOf(this.searchedField() ?? 'name')
		);
	}

	/** Back to the whole catalog: that search is over. */
	public clearSearch(field: AlbumSearchField): void {
		// Emptying the box that is not searched from leaves the list alone.
		if (this.searchedField() !== field) {
			return;
		}

		this.place.setFilter(field, '');
		this.term$$.next('');
	}

	public editAlbum(album: AlbumEntity): void {
		this.router.navigate(['../edit', album?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the album is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(album: AlbumEntity): unknown[] {
		return ['/album', album.uid];
	}

	/**
	 * The albums (or the search result while a term is on), the last changed
	 * first. A search left behind is taken up again, so coming back from an
	 * album finds the list as it was.
	 */
	public init$(): Observable<AlbumTableParams> {
		const field = this.searchedField();

		if (field) {
			this.dispatchSearch(field, this.place.filterOf(field));
		}

		return combineLatest([
			this.albumStateService.selectEntities$(),
			this.albumStateService.selectSearchResult$(),
			this.term$$,
		]).pipe(
			map(([albums, result, term]) => ({
				albums: sortByRecent(term ? result : albums),
				empty: [],
			})),
			switchMap((params) => {
				this.params = params;

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchByArtistName(term: string): void {
		this.search('artist', term);
	}

	public searchByName(term: string): void {
		this.search('name', term);
	}

	private dispatchSearch(field: AlbumSearchField, term: string): void {
		const searchParams: SearchParams =
			field === 'artist'
				? this.albumUtilService.createSearchParamsByArtist(
						EntityTypeEnum.Album,
						term.toLowerCase()
					)
				: this.albumUtilService.createSearchParams(
						EntityTypeEnum.Album,
						term.toLowerCase()
					);

		this.albumStateService.dispatchSearch(searchParams);
	}

	/** One search at a time: the box that is not searched from is emptied. */
	private search(field: AlbumSearchField, term: string): void {
		this.place.setFilter(field === 'artist' ? 'name' : 'artist', '');
		this.place.setFilter(field, term);
		this.term$$.next(term);
		this.dispatchSearch(field, term);
	}

	private searchedField(): AlbumSearchField | null {
		if (this.place.filterOf('artist')) {
			return 'artist';
		}

		return this.place.filterOf('name') ? 'name' : null;
	}
}
