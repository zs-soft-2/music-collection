import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ArtistEntity,
	ArtistStateService,
	ArtistUtilService,
	EntityTypeEnum,
	ExportImportService,
} from '@music-collection/api';
import { first, of } from 'rxjs';

import { ArtistTableService } from './artist-table.service';

const artist = (uid: string, name: string): ArtistEntity =>
	({ entityType: EntityTypeEnum.Artist, name, uid }) as ArtistEntity;

describe('ArtistTableService', () => {
	const nirvana = artist('1', 'Nirvana');
	const pixies = artist('2', 'Pixies');
	const searchParams = { entityType: EntityTypeEnum.Artist };

	let dispatchSearch: jest.Mock;
	let service: ArtistTableService;

	const create = () => {
		dispatchSearch = jest.fn();

		TestBed.configureTestingModule({
			providers: [
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
