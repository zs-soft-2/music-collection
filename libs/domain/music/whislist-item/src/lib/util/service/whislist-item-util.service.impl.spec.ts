import { TestBed } from '@angular/core/testing';

import { WhislistItemUtilServiceImpl } from './whislist-item-util.service.impl';

describe('WhislistItemUtilServiceImpl', () => {
	let service: WhislistItemUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(WhislistItemUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
