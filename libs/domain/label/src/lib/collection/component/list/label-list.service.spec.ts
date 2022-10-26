import { TestBed } from '@angular/core/testing';

import { LabelListService } from './label-list.service';

describe('LabelListService', () => {
	let service: LabelListService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(LabelListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
