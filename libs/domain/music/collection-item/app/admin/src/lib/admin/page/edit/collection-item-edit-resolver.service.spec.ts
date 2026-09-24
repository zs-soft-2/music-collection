import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { CollectionItemStateService } from '@music-collection/api';

import { CollectionItemEditResolverService } from './collection-item-edit-resolver.service';

describe('CollectionItemEditResolverService', () => {
	let service: CollectionItemEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				CollectionItemEditResolverService,
				{ provide: CollectionItemStateService, useValue: {} },
			],
		});

		service = TestBed.inject(CollectionItemEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
