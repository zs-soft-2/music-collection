import { TestBed } from '@angular/core/testing';

import { DocumentUtilServiceImpl } from './document-util.service.impl';

describe('DocumentUtilServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [DocumentUtilServiceImpl],
		})
	);

	it('should be created', () => {
		const service: DocumentUtilServiceImpl = TestBed.inject(
			DocumentUtilServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
