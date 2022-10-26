import { TestBed } from '@angular/core/testing';

import { CollectionItemUtilServiceImpl } from './collection-item-util.service.impl';

describe('CollectionItemUtilServiceImpl', () => {
	let service: CollectionItemUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(CollectionItemUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
