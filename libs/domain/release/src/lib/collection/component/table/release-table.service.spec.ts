import { TestBed } from '@angular/core/testing';

import { ReleaseTableService } from './release-table.service';

describe('ReleaseTableService', () => {
	let service: ReleaseTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(ReleaseTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
