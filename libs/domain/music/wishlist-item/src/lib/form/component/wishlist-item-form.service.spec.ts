import { TestBed } from '@angular/core/testing';

import { WishlistItemFormService } from './wishlist-item-form.service';

describe('WishlistItemFormService', () => {
	let service: WishlistItemFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [WishlistItemFormService],
		});

		service = TestBed.inject(WishlistItemFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
