import { TestBed } from '@angular/core/testing';

import { CollectionItemFormService } from './collection-item-form.service';

describe('CollectionItemFormService', () => {
	let service: CollectionItemFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CollectionItemFormService],
		});

		service = TestBed.inject(CollectionItemFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
