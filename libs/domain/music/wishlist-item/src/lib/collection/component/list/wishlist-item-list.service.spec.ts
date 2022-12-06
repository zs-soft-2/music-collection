import { TestBed } from '@angular/core/testing';

import { WishlistItemListService } from './wishlist-item-list.service';

describe('WishlistItemListService', () => {
	let service: WishlistItemListService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(WishlistItemListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
