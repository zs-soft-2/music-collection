import { TestBed } from '@angular/core/testing';

import { DocumentEditResolverService } from './document-edit-resolver.service';

describe('DocumentEditResolverService', () => {
	let service: DocumentEditResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [DocumentEditResolverService],
		});

		service = TestBed.inject(DocumentEditResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
