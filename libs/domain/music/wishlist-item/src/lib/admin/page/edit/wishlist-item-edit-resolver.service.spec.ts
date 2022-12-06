import { TestBed } from '@angular/core/testing';

import { WishlistItemEditResolverService } from './wishlist-item-edit-resolver.service';

describe('WishlistItemEditResolverService', () => {
	let service: WishlistItemEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [WishlistItemEditResolverService],
		});

		service = TestBed.inject(WishlistItemEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
