import { TestBed } from '@angular/core/testing';

import { CollectionItemTableService } from './collection-item-table.service';

describe('CollectionItemTableService', () => {
	let service: CollectionItemTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(CollectionItemTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
