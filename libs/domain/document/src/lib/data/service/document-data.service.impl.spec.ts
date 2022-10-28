import { TestBed } from '@angular/core/testing';

import { DocumentDataServiceImpl } from './document-data.service.impl';

describe('DocumentDataServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [DocumentDataServiceImpl],
		})
	);

	it('should be created', () => {
		const service: DocumentDataServiceImpl = TestBed.inject(
			DocumentDataServiceImpl
		);
		expect(service).toBeTruthy();
	});
});
