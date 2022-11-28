import { TestBed } from '@angular/core/testing';

import { ArtistUtilServiceImpl } from './artist-util.service.impl';

describe('ArtistUtilServiceImpl', () => {
	let service: ArtistUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(ArtistUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
