import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ArtistEntity,
	ArtistStateService,
	ArtistUtilService,
	EntityTypeEnum,
	ExportImportService,
} from '@music-collection/api';
import { BehaviorSubject, first, of } from 'rxjs';
import { GenreEffect } from '@music-collection/domain/genre';

import { ArtistTableService } from './artist-table.service';

const artist = (uid: string, name: string, genre = 'Rock'): ArtistEntity =>
	({ entityType: EntityTypeEnum.Artist, name, uid, genre }) as ArtistEntity;

/** The taxonomy as `GenreEffect` serves it: names are all this list needs. */
const taxonomy = (...names: string[]) =>
	names.map((name) => ({ name })) as never[];

describe('ArtistTableService', () => {
	const nirvana = artist('1', 'Nirvana');
	const pixies = artist('2', 'Pixies');
	const searchParams = { entityType: EntityTypeEnum.Artist };

	let dispatchSearch: jest.Mock;
	let service: ArtistTableService;
	let genres: BehaviorSubject<never[]>;

	const create = () => {
		dispatchSearch = jest.fn();
		genres = new BehaviorSubject(taxonomy('Rock', 'Jazz'));

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ArtistTableService,
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						dispatchSearch,
						selectEntities$: () => of([nirvana, pixies]),
						selectSearchResult$: () => of([nirvana]),
					},
				},
				{
					provide: ArtistUtilService,
					useValue: { createSearchParams: () => searchParams },
				},
				{ provide: ExportImportService, useValue: {} },
				{ provide: GenreEffect, useValue: { taxonomy$: genres } },
			],
		});

		service = TestBed.inject(ArtistTableService);
	};

	beforeEach(() => {
		sessionStorage.clear();
		TestBed.resetTestingModule();
		create();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('shows every artist while nothing is searched', (done) => {
		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.artists).toEqual([nirvana, pixies]);
				expect(dispatchSearch).not.toHaveBeenCalled();
				done();
			});
	});

	it('shows the search result while a name is searched', (done) => {
		service.searchByName('nirvana');

		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.artists).toEqual([nirvana]);
				done();
			});
	});

	it('takes up again the search it was left on', (done) => {
		service.searchByName('nirvana');

		// What coming back from an artist does: the service is built anew.
		TestBed.resetTestingModule();
		create();

		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(service.place.filterOf('name')).toBe('nirvana');
				expect(params.artists).toEqual([nirvana]);
				expect(dispatchSearch).toHaveBeenCalledWith(searchParams);
				done();
			});
	});

	it('shows every artist again once the search is cleared', (done) => {
		service.searchByName('nirvana');
		service.clearSearch();

		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.artists).toEqual([nirvana, pixies]);
				done();
			});
	});
});

/**
 * The artists outside the taxonomy. They are worth finding because they are
 * invisible rather than merely unfinished: the genre bundles are built per
 * genre, so an artist in none of them reaches no narrowed client.
 */
describe('ArtistTableService: the artists without a genre', () => {
	const nirvana = artist('1', 'Nirvana', 'Rock');
	/** What a Discogs credit import leaves behind: a name and nothing else. */
	const credited = {
		entityType: EntityTypeEnum.Artist,
		name: 'Fate',
		uid: '2',
	} as ArtistEntity;
	/** A value from the retired enum, which the taxonomy no longer names. */
	const realm = artist('3', 'Realm', 'THRASH_METAL');

	let genres: BehaviorSubject<never[]>;
	let service: ArtistTableService;

	const create = () => {
		genres = new BehaviorSubject(taxonomy('Rock', 'Jazz'));

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ArtistTableService,
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						dispatchSearch: jest.fn(),
						selectEntities$: () => of([nirvana, credited, realm]),
						selectSearchResult$: () => of([]),
					},
				},
				{
					provide: ArtistUtilService,
					useValue: { createSearchParams: () => ({}) },
				},
				{ provide: ExportImportService, useValue: {} },
				{ provide: GenreEffect, useValue: { taxonomy$: genres } },
			],
		});

		service = TestBed.inject(ArtistTableService);
	};

	beforeEach(() => {
		sessionStorage.clear();
		TestBed.resetTestingModule();
		create();
	});

	it('counts them while showing everybody', (done) => {
		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.artists).toHaveLength(3);
				expect(params.incomplete).toBe(false);
				expect(params.incompleteCount).toBe(2);
				done();
			});
	});

	it('narrows the list to them, the missing field and the retired value alike', (done) => {
		service.showIncompleteOnly(true);

		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.artists.map(({ name }) => name)).toEqual([
					'Fate',
					'Realm',
				]);
				expect(params.incomplete).toBe(true);
				done();
			});
	});

	it('takes up again the narrowing it was left on', (done) => {
		service.showIncompleteOnly(true);

		// What coming back from an artist does: the service is built anew.
		TestBed.resetTestingModule();
		create();

		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.artists.map(({ name }) => name)).toEqual([
					'Fate',
					'Realm',
				]);
				done();
			});
	});

	/**
	 * `taxonomy$` starts empty rather than pending, and judging against an
	 * empty taxonomy would call the whole catalog incomplete — a list of
	 * eight hundred artists to "fix", every one of them already right.
	 */
	it('calls nobody incomplete while the taxonomy has not arrived', (done) => {
		genres.next([]);

		service
			.init$()
			.pipe(first())
			.subscribe((params) => {
				expect(params.incompleteCount).toBe(0);
				done();
			});
	});
});
