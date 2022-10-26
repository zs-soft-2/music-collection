import { TestBed } from '@angular/core/testing';
import { CollectionItemStateService } from '@music-collection/api';

import { CollectionItemListPageResolverService } from './collection-item-list-page-resolver.service';

describe('CollectionItemListPageResolverService', () => {
	let service: CollectionItemListPageResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				CollectionItemListPageResolverService,
				{
					provide: CollectionItemStateService,
					useValue: {},
				},
			],
		});
		service = TestBed.inject(CollectionItemListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
