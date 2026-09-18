import { TestBed } from '@angular/core/testing';

import { ReleaseUtilServiceImpl } from './release-util.service.impl';

describe('ReleaseUtilServiceImpl', () => {
	let service: ReleaseUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ReleaseUtilServiceImpl],
		});
		service = TestBed.inject(ReleaseUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
