import { TestBed } from '@angular/core/testing';

import { WishlistItemTableService } from './wishlist-item-table.service';

describe('WishlistItemTableService', () => {
	let service: WishlistItemTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(WishlistItemTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
