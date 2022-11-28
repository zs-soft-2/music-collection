import { TestBed } from '@angular/core/testing';

import { LabelTableService } from './label-table.service';

describe('LabelTableService', () => {
	let service: LabelTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(LabelTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
