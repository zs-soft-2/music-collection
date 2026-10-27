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
import { GenreEffect } from '@music-collection/domain/genre';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

/** The filter's name in the place, and the value that means it is on. */
const INCOMPLETE_FILTER = 'incomplete';
const ON = 'on';

@Injectable()
export class ArtistTableService extends BaseComponent {
	private activatedRoute = inject(ActivatedRoute);
	private artistStateService = inject(ArtistStateService);
	private genreEffect = inject(GenreEffect);
	private artistUtilService = inject(ArtistUtilService);
	private exportImportService = inject(ExportImportService);
	private router = inject(Router);

	private params!: ArtistTableParams;
	private params$$: ReplaySubject<ArtistTableParams>;
	/** The name the list is narrowed by, empty while nothing is searched. */
	private term$$: BehaviorSubject<string>;
	/** Whether only the artists outside the taxonomy are listed. */
	private incomplete$$: BehaviorSubject<boolean>;

	public readonly collectionView = createCollectionView(
		'mc.admin.artists.view'
	);

	public readonly place = createCollectionPlace('mc.admin.artists');

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
		this.term$$ = new BehaviorSubject<string>(this.place.filterOf('name'));
		this.incomplete$$ = new BehaviorSubject<boolean>(
			this.place.filterOf(INCOMPLETE_FILTER) === ON
		);
	}

	/**
	 * Narrow the list to the artists the taxonomy does not name, or widen it
	 * again. Kept with the rest of the place, so coming back from an artist
	 * finds the same short list rather than all eight hundred.
	 */
	public showIncompleteOnly(incomplete: boolean): void {
		this.place.setFilter(INCOMPLETE_FILTER, incomplete ? ON : '');
		this.incomplete$$.next(incomplete);
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
			this.incomplete$$,
			this.genreEffect.taxonomy$,
		]).pipe(
			map(([artists, result, term, incomplete, taxonomy]) => {
				const listed = sortByRecent(term ? result : artists);
				const named = new Set(taxonomy.map(({ name }) => name));
				/**
				 * An artist the taxonomy does not name. The empty taxonomy
				 * is the answer before the first one arrives (`taxonomy$`
				 * starts empty rather than pending), and judging against it
				 * would call every artist in the catalog incomplete — so
				 * until it is here, nobody is.
				 */
				const missing = ({ genre }: ArtistEntity) =>
					named.size > 0 && !named.has(genre);
				const incompleteCount = listed.filter(missing).length;

				return {
					artists: incomplete ? listed.filter(missing) : listed,
					empty: [],
					incomplete,
					incompleteCount,
				};
			}),
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
