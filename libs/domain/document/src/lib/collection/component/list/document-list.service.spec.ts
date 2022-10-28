import { TestBed } from '@angular/core/testing';

import { DocumentListService } from './document-list.service';

describe('DocumentListService', () => {
	let service: DocumentListService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(DocumentListService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
