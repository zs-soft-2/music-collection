import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistItemListService } from './wishlist-item-list.service';

describe('WishlistItemListService', () => {
	let service: WishlistItemListService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
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
