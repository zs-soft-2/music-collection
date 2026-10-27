import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { WishlistItemUtilServiceImpl } from './wishlist-item-util.service.impl';

describe('WishlistItemUtilServiceImpl', () => {
	let service: WishlistItemUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), WishlistItemUtilServiceImpl],
		});
		service = TestBed.inject(WishlistItemUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
