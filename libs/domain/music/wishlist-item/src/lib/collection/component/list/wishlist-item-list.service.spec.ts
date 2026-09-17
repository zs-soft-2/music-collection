import { TestBed } from '@angular/core/testing';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistItemListService } from './wishlist-item-list.service';

describe('WishlistItemListService', () => {
	let service: WishlistItemListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				WishlistItemListService,
				{ provide: WishlistItemStateService, useValue: {} },
			],
		});

		service = TestBed.inject(WishlistItemListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
