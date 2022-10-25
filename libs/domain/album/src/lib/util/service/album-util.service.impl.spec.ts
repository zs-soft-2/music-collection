import { TestBed } from '@angular/core/testing';

import { AlbumUtilServiceImpl } from './album-util.service.impl';

describe('AlbumUtilServiceImpl', () => {
	let service: AlbumUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(AlbumUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
