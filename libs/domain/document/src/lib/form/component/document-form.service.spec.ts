import { TestBed } from '@angular/core/testing';

import { DocumentFormService } from './document-form.service';

describe('DocumentFormService', () => {
	let service: DocumentFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [DocumentFormService],
		});

		service = TestBed.inject(DocumentFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
