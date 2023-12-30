import { TestBed } from '@angular/core/testing';
import { DocumentStateService } from '@music-collection/api';

import { DocumentListPageResolverService } from './document-list-page-resolver.service';

describe('DocumentListPageResolverService', () => {
	let service: DocumentListPageResolverService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				DocumentListPageResolverService,
				{
					provide: DocumentStateService,
					useValue: {},
				},
			],
		});
		service = TestBed.inject(DocumentListPageResolverService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
