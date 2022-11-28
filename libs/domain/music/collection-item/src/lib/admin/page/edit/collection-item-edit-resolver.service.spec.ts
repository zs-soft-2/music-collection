import { TestBed } from '@angular/core/testing';

import { CollectionItemEditResolverService } from './collection-item-edit-resolver.service';

describe('CollectionItemEditResolverService', () => {
	let service: CollectionItemEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CollectionItemEditResolverService],
		});

		service = TestBed.inject(CollectionItemEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
