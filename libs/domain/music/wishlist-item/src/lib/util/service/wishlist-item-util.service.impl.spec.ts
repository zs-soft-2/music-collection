import { TestBed } from '@angular/core/testing';

import { WishlistItemUtilServiceImpl } from './wishlist-item-util.service.impl';

describe('WishlistItemUtilServiceImpl', () => {
	let service: WishlistItemUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(WishlistItemUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
