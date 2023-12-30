import { TestBed } from '@angular/core/testing';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistItemListPageResolverService } from './wishlist-item-list-page-resolver.service';

describe('WishlistItemListPageResolverService', () => {
	let service: WishlistItemListPageResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				WishlistItemListPageResolverService,
				{
					provide: WishlistItemStateService,
					useValue: {},
				},
			],
		});
		service = TestBed.inject(WishlistItemListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
