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
