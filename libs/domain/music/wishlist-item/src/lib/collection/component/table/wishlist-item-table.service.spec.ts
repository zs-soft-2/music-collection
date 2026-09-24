import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ExportImportService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemTableService } from './wishlist-item-table.service';

describe('WishlistItemTableService', () => {
	let service: WishlistItemTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				WishlistItemTableService,
				provideRouter([]),
				{ provide: WishlistItemStateService, useValue: {} },
				{ provide: WishlistItemUtilService, useValue: {} },
				{ provide: ExportImportService, useValue: {} },
			],
		});

		service = TestBed.inject(WishlistItemTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
