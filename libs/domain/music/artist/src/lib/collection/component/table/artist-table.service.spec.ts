import { TestBed } from '@angular/core/testing';

import { ArtistTableService } from './artist-table.service';

describe('ArtistTableService', () => {
	let service: ArtistTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(ArtistTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
