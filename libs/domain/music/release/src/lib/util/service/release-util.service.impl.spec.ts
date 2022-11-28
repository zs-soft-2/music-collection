import { TestBed } from '@angular/core/testing';

import { ReleaseUtilServiceImpl } from './release-util.service.impl';

describe('ReleaseUtilServiceImpl', () => {
	let service: ReleaseUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(ReleaseUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
