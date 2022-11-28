import { TestBed } from '@angular/core/testing';

import { LabelUtilServiceImpl } from './label-util.service.impl';

describe('LabelUtilServiceImpl', () => {
	let service: LabelUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(LabelUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
