import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistItemEditResolverService } from './wishlist-item-edit-resolver.service';

describe('WishlistItemEditResolverService', () => {
	let service: WishlistItemEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				WishlistItemEditResolverService,
				{ provide: WishlistItemStateService, useValue: {} },
			],
		});

		service = TestBed.inject(WishlistItemEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
