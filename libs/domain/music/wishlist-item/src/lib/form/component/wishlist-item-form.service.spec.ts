import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	AuthenticationStateService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemFormService } from './wishlist-item-form.service';

describe('WishlistItemFormService', () => {
	let service: WishlistItemFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				WishlistItemFormService,
				provideRouter([]),
				{ provide: AlbumStateService, useValue: {} },
				{ provide: ArtistStateService, useValue: {} },
				{ provide: AuthenticationStateService, useValue: {} },
				{ provide: WishlistItemStateService, useValue: {} },
				{ provide: WishlistItemUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(WishlistItemFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
