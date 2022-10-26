import { TestBed } from '@angular/core/testing';

import { ReleaseListService } from './release-list.service';

describe('ReleaseListService', () => {
	let service: ReleaseListService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(ReleaseListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
