import { TestBed } from '@angular/core/testing';

import { CollectionItemListService } from './collection-item-list.service';

describe('CollectionItemListService', () => {
	let service: CollectionItemListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CollectionItemListService],
		});

		service = TestBed.inject(CollectionItemListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
