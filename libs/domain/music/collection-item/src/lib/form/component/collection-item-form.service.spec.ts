import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	CollectionItemStateService,
	CollectionItemUtilService,
	ReleaseStateService,
} from '@music-collection/api';

import { CollectionItemFormService } from './collection-item-form.service';

describe('CollectionItemFormService', () => {
	let service: CollectionItemFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				CollectionItemFormService,
				{ provide: AuthenticationStateService, useValue: {} },
				{ provide: CollectionItemStateService, useValue: {} },
				{ provide: CollectionItemUtilService, useValue: {} },
				{ provide: ReleaseStateService, useValue: {} },
			],
		});

		service = TestBed.inject(CollectionItemFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
