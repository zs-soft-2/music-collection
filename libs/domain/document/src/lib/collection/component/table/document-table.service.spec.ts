import { TestBed } from '@angular/core/testing';

import { DocumentTableService } from './document-table.service';

describe('DocumentTableService', () => {
	let service: DocumentTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({});

		service = TestBed.inject(DocumentTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
