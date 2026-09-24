import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	CollectionItemStateService,
	CollectionItemUtilService,
} from '@music-collection/api';

import { CollectionItemTableService } from './collection-item-table.service';

describe('CollectionItemTableService', () => {
	let service: CollectionItemTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				CollectionItemTableService,
				{ provide: CollectionItemStateService, useValue: {} },
				{ provide: CollectionItemUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(CollectionItemTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
