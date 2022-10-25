import { TestBed } from '@angular/core/testing';

import { EntityQuantityUtilServiceImpl } from './entity-quantity-util.service.impl';

describe('EntityQuantityUtilServiceImpl', () => {
	let service: EntityQuantityUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(EntityQuantityUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
